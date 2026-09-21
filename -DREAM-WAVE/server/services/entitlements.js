const { AppError } = require('../middleware/errorHandler');
const { getPlan, listPlans } = require('../config/plans');
const { isStripeConfigured, isCheckoutEnabled } = require('./stripeService');
const User = require('../models/User');

/**
 * Single entitlement authority — do not scatter plan checks in controllers/UI.
 */
function getEntitlements(user) {
  const plan = getPlan(user.plan);
  const credits = Math.max(0, user.credits ?? 0);
  return {
    planId: plan.id,
    label: plan.label,
    credits,
    monthlyCredits: plan.monthlyCredits,
    maxUploadMb: plan.maxUploadMb,
    features: plan.features,
    aiCallsRemaining: credits,
  };
}

function assertCanUseAi(user) {
  if (!getPlan(user.plan).features.aiChat) {
    throw new AppError('AI chat is not included in your plan.', 403);
  }
  if ((user.credits || 0) <= 0) {
    throw new AppError('AI credits exhausted. Upgrade your plan to continue.', 402);
  }
}

async function recordAiUsage(user, meta = {}) {
  if (!meta?.mode && !meta?.source) return;
  try {
    const AiUsage = require('../models/AiUsage');
    const ALLOWED_SOURCES = new Set([
      'run',
      'quick',
      'stream',
      'mentor',
      'specialized',
      'system',
      'research',
      'career',
      'productivity',
      'adaptive',
      'books',
      'learning',
      'media',
      'report',
      'roadmap',
      'personalization',
    ]);
    const promptChars = meta.promptChars || 0;
    const replyChars = meta.replyChars || 0;
    const tokensIn = meta.tokensIn != null ? meta.tokensIn : Math.ceil(promptChars / 4);
    const tokensOut = meta.tokensOut != null ? meta.tokensOut : Math.ceil(replyChars / 4);
    const model = meta.model || '';
    const estimatedCostUsd =
      meta.estimatedCostUsd != null
        ? meta.estimatedCostUsd
        : estimateAiCostUsd(model, tokensIn, tokensOut);

    let failureClass = meta.failureClass || '';
    if (!meta.success && !failureClass) {
      failureClass = meta.errorCode?.includes('credit')
        ? 'entitlement'
        : meta.errorCode?.includes('timeout')
          ? 'timeout'
          : 'ai_provider';
    }

    const rawSource = String(meta.source || 'system');
    const source = ALLOWED_SOURCES.has(rawSource) ? rawSource : 'specialized';

    await AiUsage.create({
      user: user._id,
      organizationId: user.organizationId || null,
      mode: meta.mode || 'system',
      model,
      source,
      creditsUsed: meta.creditsUsed ?? 1,
      success: meta.success !== false,
      errorCode: meta.errorCode || '',
      failureClass,
      latencyMs: meta.latencyMs || 0,
      promptChars,
      replyChars,
      tokensIn,
      tokensOut,
      estimatedCostUsd,
      conversationId: meta.conversationId || null,
    });
  } catch (err) {
    console.warn('AiUsage record failed:', err.message);
  }
}

/** Rough USD estimate for monitoring (not billing). */
function estimateAiCostUsd(model, tokensIn, tokensOut) {
  const m = String(model || '').toLowerCase();
  let inPerM = 0.15;
  let outPerM = 0.6;
  if (m.includes('gpt-4o') && !m.includes('mini')) {
    inPerM = 2.5;
    outPerM = 10;
  } else if (m.includes('fallback') || m === 'local') {
    return 0;
  }
  return Math.round(((tokensIn * inPerM + tokensOut * outPerM) / 1e6) * 1e6) / 1e6;
}

async function consumeAiCredit(user, amount = 1, meta = null) {
  if (!getPlan(user.plan).features.aiChat) {
    throw new AppError('AI chat is not included in your plan.', 403);
  }
  const updated = await User.findOneAndUpdate(
    { _id: user._id, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { new: true }
  );
  if (!updated) {
    throw new AppError('AI credits exhausted. Upgrade your plan to continue.', 402);
  }
  user.credits = updated.credits;
  if (meta) {
    await recordAiUsage(user, { ...meta, creditsUsed: amount });
  }
  return user.credits;
}

async function refundAiCredit(user, amount = 1) {
  const updated = await User.findByIdAndUpdate(
    user._id,
    { $inc: { credits: Math.max(0, amount) } },
    { new: true }
  );
  if (updated) user.credits = updated.credits;
  return user.credits;
}

/**
 * Atomically reserve credits, run work, refund on failure.
 * Prefer this over assertCanUseAi → work → consumeAiCredit (TOCTOU).
 */
async function runWithAiCredit(user, amount, work, meta) {
  await consumeAiCredit(user, amount);
  try {
    const result = await work();
    const live = isLiveAiResult(result);
    if (!live) {
      await refundAiCredit(user, amount);
      if (meta) {
        const usage = typeof meta === 'function' ? meta(result) : meta;
        if (usage) {
          await recordAiUsage(user, {
            ...usage,
            creditsUsed: 0,
            success: true,
            errorCode: usage.errorCode || 'local_fallback',
          });
        }
      }
      return result;
    }
    if (meta) {
      const usage = typeof meta === 'function' ? meta(result) : meta;
      if (usage) {
        await recordAiUsage(user, {
          ...usage,
          creditsUsed: amount,
          success: usage.success !== false,
        });
      }
    }
    return result;
  } catch (err) {
    await refundAiCredit(user, amount);
    throw err;
  }
}

function isLiveAiResult(result) {
  if (result == null) return false;
  if (typeof result !== 'object') {
    // Legacy string-only payloads — only treat as live when an API key is configured
    return Boolean(process.env.OPENAI_API_KEY);
  }
  if (result.usedAi === false) return false;
  if (result.usedAi === true) return true;
  if (result.provider === 'local' || result.model === 'fallback') return false;
  if (result.recovered) return false;
  return true;
}

function publicBilling(user) {
  const enabled = isCheckoutEnabled();
  return {
    entitlements: getEntitlements(user),
    catalog: listPlans().map((p) => ({
      id: p.id,
      label: p.label,
      monthlyCredits: p.monthlyCredits,
      maxUploadMb: p.maxUploadMb,
      features: p.features,
    })),
    stripe: {
      configured: isStripeConfigured(),
      checkoutEnabled: enabled,
      note: enabled
        ? 'Stripe Checkout and Customer Portal are enabled.'
        : 'Stripe is not fully configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO, and STRIPE_PRICE_TEAM.',
    },
  };
}

module.exports = {
  getEntitlements,
  assertCanUseAi,
  consumeAiCredit,
  refundAiCredit,
  runWithAiCredit,
  isLiveAiResult,
  recordAiUsage,
  estimateAiCostUsd,
  publicBilling,
};

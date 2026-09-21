const Stripe = require('stripe');
const User = require('../models/User');
const { getPlan } = require('../config/plans');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function isCheckoutEnabled() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_PRO &&
      process.env.STRIPE_PRICE_TEAM
  );
}

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function priceIdForPlan(planId) {
  if (planId === 'pro') return process.env.STRIPE_PRICE_PRO || '';
  if (planId === 'team') return process.env.STRIPE_PRICE_TEAM || '';
  return '';
}

function planIdFromPrice(priceId) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_TEAM) return 'team';
  return null;
}

async function assignPlan(user, planId, { resetCredits = true } = {}) {
  const plan = getPlan(planId || 'free');
  const prevPlan = user.plan;
  user.plan = plan.id;
  if (resetCredits || prevPlan !== plan.id) {
    user.credits = plan.monthlyCredits;
  }
  await user.save({ validateBeforeSave: false });
  return user;
}

async function ensureCustomer(user) {
  const stripe = getStripe();
  if (!stripe) throw new AppError('Billing is not configured', 503);

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user._id) },
  });
  user.stripeCustomerId = customer.id;
  await user.save({ validateBeforeSave: false });
  return customer.id;
}

async function createCheckoutSession(user, planId) {
  if (!isCheckoutEnabled()) {
    throw new AppError('Billing checkout is not configured', 503, { failureClass: 'infrastructure' });
  }
  if (!['pro', 'team'].includes(planId)) throw new AppError('Invalid plan for checkout', 400);

  const priceId = priceIdForPlan(planId);
  if (!priceId) throw new AppError('Stripe price is not configured for this plan', 503);

  const stripe = getStripe();
  const customerId = await ensureCustomer(user);
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0];

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${clientUrl}/settings?billing=success`,
    cancel_url: `${clientUrl}/settings?billing=cancel`,
    client_reference_id: String(user._id),
    metadata: { userId: String(user._id), planId },
    subscription_data: {
      metadata: { userId: String(user._id), planId },
    },
  });

  return { url: session.url, id: session.id };
}

async function createPortalSession(user) {
  if (!isCheckoutEnabled()) {
    throw new AppError('Billing portal is not configured', 503, { failureClass: 'infrastructure' });
  }
  if (!user.stripeCustomerId) throw new AppError('No billing customer on file', 400);

  const stripe = getStripe();
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0];
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${clientUrl}/settings`,
  });
  return { url: session.url };
}

async function findUserFromStripeObject(obj = {}) {
  const metaUserId = obj.metadata?.userId || obj.client_reference_id;
  if (metaUserId) {
    const byId = await User.findById(metaUserId);
    if (byId) return byId;
  }
  if (obj.customer) {
    const byCustomer = await User.findOne({ stripeCustomerId: obj.customer });
    if (byCustomer) return byCustomer;
  }
  return null;
}

async function handleCheckoutCompleted(session) {
  const user = await findUserFromStripeObject(session);
  if (!user) {
    logger.warn('Stripe checkout completed but user not found', { sessionId: session.id });
    return;
  }

  let planId = session.metadata?.planId || null;
  if (!planId && session.subscription) {
    const stripe = getStripe();
    const sub =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;
    const priceId = sub.items?.data?.[0]?.price?.id;
    planId = planIdFromPrice(priceId) || sub.metadata?.planId;
    user.stripeSubscriptionId = sub.id;
  }

  if (session.customer) user.stripeCustomerId = session.customer;
  if (session.subscription && typeof session.subscription === 'string') {
    user.stripeSubscriptionId = session.subscription;
  }

  await assignPlan(user, planId || 'pro');
  logger.info('Stripe checkout applied', { userId: String(user._id), plan: user.plan });
}

async function handleSubscriptionUpdated(subscription) {
  const user = await findUserFromStripeObject(subscription);
  if (!user) {
    logger.warn('Stripe subscription update: user not found', { sub: subscription.id });
    return;
  }

  user.stripeSubscriptionId = subscription.id;
  if (subscription.customer) user.stripeCustomerId = subscription.customer;

  const status = subscription.status;
  if (status === 'active' || status === 'trialing') {
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const planId = planIdFromPrice(priceId) || subscription.metadata?.planId || 'pro';
    // Only reset credits when the plan actually changes (avoid webhook retry wipe)
    await assignPlan(user, planId, { resetCredits: false });
  } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(status)) {
    user.stripeSubscriptionId = undefined;
    await assignPlan(user, 'free', { resetCredits: true });
  } else {
    await user.save({ validateBeforeSave: false });
  }
}

async function handleSubscriptionDeleted(subscription) {
  const user = await findUserFromStripeObject(subscription);
  if (!user) return;
  user.stripeSubscriptionId = undefined;
  await assignPlan(user, 'free');
  logger.info('Stripe subscription deleted → free', { userId: String(user._id) });
}

/**
 * Verify signature and dispatch. `rawBody` must be a Buffer.
 */
async function constructAndHandleWebhook(rawBody, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe webhook is not configured', 503);
  }
  if (!signature) throw new AppError('Missing Stripe-Signature', 400);

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  const StripeWebhookEvent = require('../models/StripeWebhookEvent');
  try {
    await StripeWebhookEvent.create({ eventId: event.id, type: event.type });
  } catch (err) {
    if (err && (err.code === 11000 || err.code === 'E11000')) {
      logger.info('Stripe webhook duplicate ignored', { eventId: event.id, type: event.type });
      return { received: true, type: event.type, duplicate: true };
    }
    throw err;
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    default:
      logger.info('Stripe webhook ignored', { type: event.type });
  }

  return { received: true, type: event.type };
}

module.exports = {
  isStripeConfigured,
  isCheckoutEnabled,
  getStripe,
  priceIdForPlan,
  planIdFromPrice,
  assignPlan,
  createCheckoutSession,
  createPortalSession,
  constructAndHandleWebhook,
};

/**
 * Dream Wave — production email via Resend.
 * API key ONLY from process.env.RESEND_API_KEY (never hardcode).
 *
 * IMPORTANT: Never report delivery success unless the provider accepted the message.
 * Dev preview files are diagnostic only and must not fake "email sent" API success.
 */
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

let client = null;

function getFrom() {
  return process.env.EMAIL_FROM || 'Dream Wave AI <onboarding@resend.dev>';
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const err = new Error('RESEND_API_KEY is not configured in server/.env');
    err.statusCode = 503;
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }
  if (!client) client = new Resend(key);
  return client;
}

/**
 * Validate email env on startup. Throws if missing in production;
 * warns in development so the API can still boot for non-email routes.
 */
function validateEmailEnv({ fatalInProduction = true } = {}) {
  const missing = [];
  if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
  if (!process.env.EMAIL_FROM) missing.push('EMAIL_FROM');

  if (missing.length === 0) {
    const from = getFrom();
    console.log('[email] Resend configured · from =', from);
    if (/onboarding@resend\.dev/i.test(from)) {
      console.warn(
        '[email] WARNING: using Resend testing sender (onboarding@resend.dev). '
        + 'OTP emails only deliver to the Resend account owner until you verify a domain '
        + 'at resend.com/domains and set EMAIL_FROM to that domain.',
      );
    }
    return { ok: true, provider: 'resend', from };
  }

  const msg = `[email] Missing env: ${missing.join(', ')}. OTP emails will fail until set.`;
  if (fatalInProduction && process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  }
  console.warn(msg);
  return { ok: false, missing, provider: 'resend' };
}

function classifyProviderError(message = '') {
  const m = String(message).toLowerCase();
  if (m.includes('verify a domain') || m.includes('only send testing emails')) {
    return 'SENDER_DOMAIN_NOT_VERIFIED';
  }
  if (m.includes('invalid api key') || m.includes('unauthorized') || m.includes('forbidden')) {
    return 'AUTHENTICATION_FAILED';
  }
  if (m.includes('rate') && m.includes('limit')) return 'RATE_LIMITED';
  if (m.includes('timeout')) return 'TIMEOUT';
  if (m.includes('invalid') && m.includes('recipient')) return 'INVALID_RECIPIENT';
  if (m.includes('connection') || m.includes('econnrefused') || m.includes('enotfound')) {
    return 'CONNECTION_FAILED';
  }
  return 'SMTP_ERROR';
}

function redactSecrets(text) {
  return String(text || '')
    .replace(/\b\d{6}\b/g, '******')
    .replace(/re_[A-Za-z0-9]+/g, 're_***');
}

function writeDevEmailDiagnostic(entry) {
  try {
    const dir = path.join(__dirname, '..', '.cache');
    fs.mkdirSync(dir, { recursive: true });
    const previewPath = path.join(dir, 'dev-email-preview.json');
    const safe = {
      ...entry,
      text: entry.text ? redactSecrets(entry.text) : null,
      html: undefined,
    };
    delete safe.devOtpPreview;
    // Optional local-only OTP preview — never written unless explicitly enabled
    if (process.env.ALLOW_DEV_OTP_PREVIEW === '1' && entry._otpForDevOnly) {
      safe.devOtpPreview = entry._otpForDevOnly;
      safe.warning = (safe.warning || '') + ' ALLOW_DEV_OTP_PREVIEW=1 enabled (local only).';
    }
    fs.writeFileSync(previewPath, JSON.stringify(safe, null, 2));
  } catch (e) {
    console.warn('[email] could not write diagnostic preview:', e.message);
  }
}

async function sendRawEmail({ to, subject, html, text }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const recipients = Array.isArray(to) ? to : [to];

  if (!process.env.RESEND_API_KEY) {
    writeDevEmailDiagnostic({
      mode: 'DEV_EMAIL_PREVIEW',
      warning: 'RESEND_API_KEY missing — email NOT sent.',
      delivered: false,
      to: recipients,
      subject,
      text: text || null,
      at: new Date().toISOString(),
      _otpForDevOnly: (String(text || '').match(/\b(\d{6})\b/) || [])[1],
    });
    const err = new Error('Email provider is not configured (RESEND_API_KEY missing).');
    err.statusCode = 503;
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const resend = getResend();
  let data;
  let error;
  try {
    const result = await resend.emails.send({
      from: getFrom(),
      to: recipients,
      subject,
      html,
      text: text || undefined,
    });
    data = result.data;
    error = result.error;
  } catch (networkErr) {
    const code = classifyProviderError(networkErr.message);
    writeDevEmailDiagnostic({
      mode: 'PROVIDER_FAILURE',
      warning: 'Resend request threw — email NOT sent.',
      delivered: false,
      providerCode: code,
      providerError: redactSecrets(networkErr.message),
      to: recipients,
      subject,
      text: text || null,
      at: new Date().toISOString(),
    });
    const err = new Error(networkErr.message || 'Email provider connection failed');
    err.statusCode = 502;
    err.code = code;
    throw err;
  }

  if (error) {
    const providerCode = classifyProviderError(error.message || String(error));
    writeDevEmailDiagnostic({
      mode: 'PROVIDER_REJECTED',
      warning: 'Resend rejected the message — email NOT sent to recipient inbox.',
      delivered: false,
      providerCode,
      providerError: redactSecrets(error.message || String(error)),
      to: recipients,
      subject,
      text: text || null,
      at: new Date().toISOString(),
      from: getFrom(),
      _otpForDevOnly: (String(text || '').match(/\b(\d{6})\b/) || [])[1],
    });
    console.warn('[email] PROVIDER_REJECTED', providerCode, '— OTP not logged.');
    const err = new Error(error.message || 'Failed to send email via Resend');
    err.statusCode = 502;
    err.code = providerCode;
    err.resend = { name: error.name, statusCode: error.statusCode };
    throw err;
  }

  const messageId = data?.id || null;
  console.log('[email] PROVIDER_ACCEPTED channel=resend id=%s', messageId ? String(messageId).slice(0, 12) + '…' : 'none');

  if (isDev) {
    writeDevEmailDiagnostic({
      mode: 'PROVIDER_ACCEPTED',
      warning: 'Provider accepted message for delivery. Inbox receipt is not guaranteed.',
      delivered: true,
      providerMessageId: messageId,
      to: recipients,
      subject,
      text: text || null,
      at: new Date().toISOString(),
      from: getFrom(),
      _otpForDevOnly: (String(text || '').match(/\b(\d{6})\b/) || [])[1],
    });
  }

  return {
    id: messageId,
    delivered: true,
    accepted: true,
    channel: 'resend',
  };
}

function otpHtml({ name, otp, purpose }) {
  if (purpose === 'reset') {
    return `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#0B0B12;color:#F8FAFC;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(139,92,246,0.35);border-radius:16px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#C4B5FD">Dream Wave AI</h1>
      <p style="opacity:0.8;margin:0 0 16px">Hello ${name || ''},</p>
      <p style="margin:0 0 8px">Your Dream Wave password reset code is:</p>
      <div style="font-size:32px;letter-spacing:0.35em;font-weight:800;text-align:center;padding:18px;background:rgba(139,92,246,0.18);border-radius:12px;margin:16px 0">${otp}</div>
      <p style="opacity:0.6;font-size:13px;margin:0 0 8px">This code expires in 10 minutes.</p>
      <p style="opacity:0.6;font-size:13px;margin:0">If you did not request this, you can ignore this email. Do not share this code with anyone.</p>
      <p style="opacity:0.5;font-size:12px;margin:20px 0 0">Dream Wave AI</p>
    </div>
  </div>`;
  }
  return `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#0B0B12;color:#F8FAFC;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(139,92,246,0.35);border-radius:16px;padding:28px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#C4B5FD">Dream Wave AI</h1>
      <p style="opacity:0.8;margin:0 0 16px">Hello ${name || ''},</p>
      <p style="margin:0 0 8px">Your Dream Wave verification code is:</p>
      <div style="font-size:32px;letter-spacing:0.35em;font-weight:800;text-align:center;padding:18px;background:rgba(139,92,246,0.18);border-radius:12px;margin:16px 0">${otp}</div>
      <p style="opacity:0.6;font-size:13px;margin:0 0 8px">This code expires in 10 minutes.</p>
      <p style="opacity:0.6;font-size:13px;margin:0">If you did not create this account, you can ignore this email. Do not share this code with anyone.</p>
      <p style="opacity:0.5;font-size:12px;margin:20px 0 0">Dream Wave AI</p>
    </div>
  </div>`;
}

/** Send 6-digit OTP — never log the code */
async function sendOTPEmail({ to, name, otp, purpose = 'verification' }) {
  if (!otp) throw new Error('OTP is required');
  return sendRawEmail({
    to,
    subject: purpose === 'reset'
      ? 'Dream Wave — Password reset code'
      : 'Verify your Dream Wave account',
    html: otpHtml({ name, otp, purpose }),
    text: purpose === 'reset'
      ? `Hello,\n\nYour Dream Wave password reset code is:\n\n${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.\nDo not share this code with anyone.\n\nDream Wave AI`
      : `Hello,\n\nYour Dream Wave verification code is:\n\n${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not create this account, you can ignore this email.\nDo not share this code with anyone.\n\nDream Wave AI`,
  });
}

async function sendWelcomeEmail({ to, name, portal }) {
  const portalLabel = portal === 'institution' ? 'Institution'
    : portal === 'company' ? 'Company' : 'Student';
  return sendRawEmail({
    to,
    subject: 'Welcome to Dream Wave AI',
    html: `
    <div style="font-family:Inter,Arial,sans-serif;background:#0B0B12;color:#F8FAFC;padding:32px">
      <div style="max-width:480px;margin:0 auto;border:1px solid rgba(139,92,246,0.35);border-radius:16px;padding:28px">
        <h1 style="color:#C4B5FD;margin-top:0">Welcome, ${name || 'explorer'} 🌊</h1>
        <p>Your <strong>${portalLabel}</strong> account on Dream Wave AI is ready.</p>
        <p style="opacity:0.7">Sign in to your portal and start building your future with AI.</p>
      </div>
    </div>`,
    text: `Welcome to Dream Wave AI, ${name || ''}. Your ${portalLabel} account is ready.`,
  });
}

async function sendPasswordResetEmail({ to, name, otp }) {
  return sendOTPEmail({ to, name, otp, purpose: 'reset' });
}

async function sendInstitutionApprovalEmail({ to, name, organizationName, approved = true }) {
  const status = approved ? 'approved' : 'needs attention';
  return sendRawEmail({
    to,
    subject: `Dream Wave — Institution account ${status}`,
    html: `
    <div style="font-family:Inter,Arial,sans-serif;background:#0B0B12;color:#F8FAFC;padding:32px">
      <div style="max-width:480px;margin:0 auto;border:1px solid rgba(14,165,233,0.4);border-radius:16px;padding:28px">
        <h1 style="color:#7DD3FC;margin-top:0">Institution ${status}</h1>
        <p>Hi ${name || 'Admin'},</p>
        <p>Your institution <strong>${organizationName || 'organization'}</strong> has been <strong>${status}</strong> on Dream Wave AI.</p>
      </div>
    </div>`,
    text: `Institution ${organizationName || ''} ${status} on Dream Wave AI.`,
  });
}

async function sendCompanyApprovalEmail({ to, name, organizationName, approved = true }) {
  const status = approved ? 'approved' : 'needs attention';
  return sendRawEmail({
    to,
    subject: `Dream Wave — Company account ${status}`,
    html: `
    <div style="font-family:Inter,Arial,sans-serif;background:#0B0B12;color:#F8FAFC;padding:32px">
      <div style="max-width:480px;margin:0 auto;border:1px solid rgba(16,185,129,0.4);border-radius:16px;padding:28px">
        <h1 style="color:#6EE7B7;margin-top:0">Company ${status}</h1>
        <p>Hi ${name || 'Admin'},</p>
        <p>Your company <strong>${organizationName || 'organization'}</strong> has been <strong>${status}</strong> on Dream Wave AI.</p>
      </div>
    </div>`,
    text: `Company ${organizationName || ''} ${status} on Dream Wave AI.`,
  });
}

/** Non-OTP delivery probe — never includes secrets or OTP */
async function sendDeliveryTestEmail({ to }) {
  return sendRawEmail({
    to,
    subject: 'Dream Wave Email Delivery Test',
    html: `<p>This is a Dream Wave email delivery test.</p>`,
    text: 'This is a Dream Wave email delivery test.',
  });
}

// Backward-compatible alias used by authController
async function sendOtpEmail(args) {
  return sendOTPEmail(args);
}

module.exports = {
  validateEmailEnv,
  sendOTPEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInstitutionApprovalEmail,
  sendCompanyApprovalEmail,
  sendDeliveryTestEmail,
  sendRawEmail,
  classifyProviderError,
  getFrom,
};

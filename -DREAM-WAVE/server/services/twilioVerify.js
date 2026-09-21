/**
 * Production phone OTP via Twilio Verify API.
 * Env only: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID
 * Never log OTP codes.
 */
const twilio = require('twilio');
const {
  assertE164,
  maskPhone,
  assertCanSend,
  recordSend,
  markVerified,
} = require('../utils/phoneOtpGuard');

let cachedClient = null;

function getConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) {
    const err = new Error(
      'Twilio Service Error. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.'
    );
    err.statusCode = 503;
    err.code = 'TWILIO_CONFIG';
    throw err;
  }
  return { accountSid, authToken, serviceSid };
}

function getClient() {
  if (cachedClient) return cachedClient;
  const { accountSid, authToken } = getConfig();
  cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}

/** Reset cached client (tests). */
function resetClient() {
  cachedClient = null;
}

function mapTwilioError(error) {
  const code = error.code;
  const status = error.status || 502;
  let message = 'Twilio Service Error';
  let statusCode = 502;
  let appCode = 'TWILIO_ERROR';

  if (code === 60200 || code === 21211) {
    message = 'Invalid Number';
    statusCode = 400;
    appCode = 'INVALID_NUMBER';
  } else if (code === 60202 || code === 60203 || code === 60212) {
    message = 'Too Many Requests';
    statusCode = 429;
    appCode = 'RATE_LIMIT';
  } else if (code === 20404 || code === 60223) {
    message = 'OTP Expired';
    statusCode = 400;
    appCode = 'OTP_EXPIRED';
  } else if (status === 401 || status === 403) {
    message = 'Twilio Service Error';
    statusCode = 503;
    appCode = 'TWILIO_AUTH';
  }

  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = appCode;
  err.twilioCode = code;
  return err;
}

/**
 * Start SMS verification for an E.164 phone number.
 * @param {string} phoneNumber
 */
async function sendOTP(phoneNumber) {
  const phone = assertE164(phoneNumber);
  await assertCanSend(phone);

  const { serviceSid } = getConfig();
  const client = getClient();

  try {
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phone, channel: 'sms' });

    await recordSend(phone);
    console.log('[TwilioVerify] OTP Sent', {
      phone: maskPhone(phone),
      status: verification.status,
    });

    return {
      success: true,
      status: verification.status,
      to: phone,
      expiresInSeconds: 600,
    };
  } catch (error) {
    console.error('[TwilioVerify] Twilio Errors', {
      phone: maskPhone(phone),
      code: error.code,
      message: error.message,
    });
    throw mapTwilioError(error);
  }
}

/**
 * Check a verification code. Never logs the code.
 * @param {string} phoneNumber
 * @param {string} code
 */
async function verifyOTP(phoneNumber, code) {
  const phone = assertE164(phoneNumber);
  const otp = String(code || '').trim();

  if (!/^\d{4,10}$/.test(otp)) {
    const err = new Error('OTP Incorrect');
    err.statusCode = 400;
    err.code = 'OTP_INCORRECT';
    console.log('[TwilioVerify] OTP Failed', { phone: maskPhone(phone), reason: 'format' });
    throw err;
  }

  const { serviceSid } = getConfig();
  const client = getClient();

  try {
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code: otp });

    if (check.status === 'approved') {
      await markVerified(phone);
      console.log('[TwilioVerify] OTP Verified', { phone: maskPhone(phone) });
      return { success: true, verified: true, to: phone };
    }

    console.log('[TwilioVerify] OTP Failed', {
      phone: maskPhone(phone),
      status: check.status,
    });
    const err = new Error('Invalid or expired OTP.');
    err.statusCode = 400;
    err.code = check.status === 'expired' ? 'OTP_EXPIRED' : 'OTP_INCORRECT';
    throw err;
  } catch (error) {
    if (error.code === 'OTP_INCORRECT' || error.code === 'OTP_EXPIRED') throw error;
    console.error('[TwilioVerify] Twilio Errors', {
      phone: maskPhone(phone),
      code: error.code,
      message: error.message,
    });
    if (error.statusCode) throw error;
    throw mapTwilioError(error);
  }
}

function validateTwilioEnv({ fatalInProduction = false } = {}) {
  try {
    getConfig();
    return true;
  } catch (err) {
    if (fatalInProduction && process.env.NODE_ENV === 'production') throw err;
    console.warn('[TwilioVerify]', err.message);
    return false;
  }
}

module.exports = {
  sendOTP,
  verifyOTP,
  resetClient,
  validateTwilioEnv,
  getConfig,
};

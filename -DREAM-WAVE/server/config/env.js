const { z } = require('zod');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32).optional().or(z.literal('')),
  JWT_ACCESS_EXPIRE: z.string().default('15m'),
  JWT_REFRESH_EXPIRE: z.string().default('7d'),
  JWT_EXPIRE: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  OPENAI_API_KEY: z.string().optional().or(z.literal('')),
  GEMINI_API_KEY: z.string().optional().or(z.literal('')),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_TIMEOUT_MS: z.coerce.number().optional(),
  SMTP_HOST: z.string().optional().or(z.literal('')),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional().or(z.literal('')),
  SMTP_PASS: z.string().optional().or(z.literal('')),
  SMTP_FROM: z.string().optional().or(z.literal('')),
  REQUIRE_EMAIL_VERIFIED: z.string().optional().or(z.literal('')),
  BILLING_ENABLED: z.string().optional().or(z.literal('')),
  STRIPE_SECRET_KEY: z.string().optional().or(z.literal('')),
  STRIPE_WEBHOOK_SECRET: z.string().optional().or(z.literal('')),
  STRIPE_PRICE_PRO: z.string().optional().or(z.literal('')),
  STRIPE_PRICE_TEAM: z.string().optional().or(z.literal('')),
  MONGO_POOL_SIZE: z.coerce.number().optional(),
  REQUEST_TIMEOUT_MS: z.coerce.number().optional(),
  RELEASE_CHANNEL: z.preprocess(
    (v) => (v === '' || v == null ? undefined : String(v).toLowerCase()),
    z.enum(['development', 'test', 'rc', 'stable', 'canary']).optional()
  ),
});

function parseOrigins(clientUrl) {
  return String(clientUrl || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isValidOrigin(origin) {
  if (origin === '*') return false;
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isBillingEnabled(data) {
  return (
    data.BILLING_ENABLED === '1' ||
    data.BILLING_ENABLED === 'true' ||
    Boolean(data.STRIPE_SECRET_KEY)
  );
}

/** Pure production gate — used by validateEnv and release tests. */
function collectProductionErrors(data, env = process.env) {
  const errors = [];
  if (!data.JWT_REFRESH_SECRET || data.JWT_REFRESH_SECRET.length < 32) {
    errors.push('JWT_REFRESH_SECRET must be set (min 32 chars) in production');
  }
  if (data.JWT_REFRESH_SECRET && data.JWT_REFRESH_SECRET === data.JWT_SECRET) {
    errors.push('JWT_REFRESH_SECRET must differ from JWT_SECRET in production');
  }
  const origins = parseOrigins(data.CLIENT_URL);
  if (!origins.length || origins.includes('*')) {
    errors.push(
      'CLIENT_URL must list explicit origins in production (wildcard * forbidden with credentials)'
    );
  }
  for (const origin of origins) {
    if (!isValidOrigin(origin)) {
      errors.push(`CLIENT_URL origin is invalid (must be http(s) URL): ${origin}`);
    } else {
      try {
        const u = new URL(origin);
        if (u.protocol !== 'https:' && env.ALLOW_INSECURE_CLIENT_URL !== '1') {
          errors.push(`CLIENT_URL must use https in production: ${origin}`);
        }
      } catch {
        errors.push(`CLIENT_URL origin is invalid: ${origin}`);
      }
    }
  }
  if (!data.SMTP_HOST || !data.SMTP_USER || !data.SMTP_PASS) {
    errors.push('SMTP_HOST, SMTP_USER, and SMTP_PASS are required in production');
  }
  if (!data.ADMIN_EMAIL) {
    errors.push('ADMIN_EMAIL is required in production (contact form inbox)');
  }
  const mongo = String(data.MONGODB_URI || '');
  if (/localhost|127\.0\.0\.1/i.test(mongo) && env.ALLOW_LOCAL_MONGO !== '1') {
    errors.push(
      'MONGODB_URI must not point at localhost in production (set ALLOW_LOCAL_MONGO=1 to override)'
    );
  }
  if (isBillingEnabled(data)) {
    if (!data.STRIPE_SECRET_KEY) errors.push('STRIPE_SECRET_KEY is required when billing is enabled');
    if (!data.STRIPE_WEBHOOK_SECRET) {
      errors.push('STRIPE_WEBHOOK_SECRET is required when billing is enabled');
    }
    if (!data.STRIPE_PRICE_PRO) errors.push('STRIPE_PRICE_PRO is required when billing is enabled');
    if (!data.STRIPE_PRICE_TEAM) errors.push('STRIPE_PRICE_TEAM is required when billing is enabled');
  }
  return errors;
}

function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
    console.error('❌ Invalid environment configuration:\n' + details);
    process.exit(1);
  }

  const data = parsed.data;
  const isProd = data.NODE_ENV === 'production';

  if (isProd) {
    if (!process.env.RELEASE_CHANNEL) {
      process.env.RELEASE_CHANNEL = 'stable';
    }
    const errors = collectProductionErrors(data, process.env);
    if (errors.length) {
      console.error('❌ Production security configuration failed:\n' + errors.join('\n'));
      process.exit(1);
    }
    if (
      process.env.REQUIRE_EMAIL_VERIFIED !== 'false' &&
      process.env.REQUIRE_EMAIL_VERIFIED !== '0'
    ) {
      process.env.REQUIRE_EMAIL_VERIFIED = 'true';
    }
  }

  return data;
}

module.exports = {
  validateEnv,
  envSchema,
  parseOrigins,
  isValidOrigin,
  collectProductionErrors,
  isBillingEnabled,
};

function validateCoreEnv({ fatalInProduction = false } = {}) {
  const production = process.env.NODE_ENV === 'production'
  const errors = []

  if (!process.env.MONGODB_URL && !process.env.MONGODB_URI) {
    errors.push('MONGODB_URL is required')
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must contain at least 32 characters')
  }
  if (production && (!process.env.AUTH_CHALLENGE_SECRET || process.env.AUTH_CHALLENGE_SECRET.length < 32)) {
    errors.push('AUTH_CHALLENGE_SECRET must contain at least 32 characters in production')
  }
  if (production && !/^https:\/\//.test(process.env.CLIENT_URL || '')) {
    errors.push('CLIENT_URL must be an HTTPS origin in production')
  }
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    errors.push('STRIPE_WEBHOOK_SECRET is required when Stripe is enabled')
  }

  if (errors.length && fatalInProduction && production) {
    const error = new Error(`Invalid production environment: ${errors.join('; ')}`)
    error.code = 'INVALID_ENVIRONMENT'
    throw error
  }
  return errors
}

module.exports = { validateCoreEnv }

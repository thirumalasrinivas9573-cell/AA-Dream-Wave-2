const { AppError } = require('./errorHandler');

/**
 * Zod request validator.
 *
 * Usage:
 *   zodValidate(schema)                 — body only (legacy)
 *   zodValidate({ body, query, params }) — selective targets
 */
const zodValidate = (schemaOrTargets) => (req, _res, next) => {
  const targets =
    schemaOrTargets && typeof schemaOrTargets.safeParse === 'function'
      ? { body: schemaOrTargets }
      : schemaOrTargets || {};

  const apply = (key, schema) => {
    if (!schema) return null;
    const result = schema.safeParse(req[key] ?? {});
    if (!result.success) {
      const message = result.error.errors
        .map((e) => `${e.path.length ? e.path.join('.') : key}: ${e.message}`)
        .join('; ');
      return new AppError(message, 400, { failureClass: 'validation' });
    }
    req[key] = result.data;
    return null;
  };

  for (const key of ['params', 'query', 'body']) {
    const err = apply(key, targets[key]);
    if (err) return next(err);
  }
  return next();
};

module.exports = { zodValidate };

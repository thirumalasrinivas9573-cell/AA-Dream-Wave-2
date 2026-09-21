const { version } = require('../package.json');

/**
 * Canonical release metadata for Dream Wave Backend v1.0.0.
 */
function resolveReleaseChannel(env = process.env) {
  const explicit = String(env.RELEASE_CHANNEL || '').trim().toLowerCase();
  if (explicit) return explicit;
  if (env.NODE_ENV === 'production') return 'stable';
  if (env.NODE_ENV === 'test') return 'test';
  return 'development';
}

function getReleaseInfo(env = process.env) {
  return {
    version: version || '1.0.0',
    channel: resolveReleaseChannel(env),
    phase: 'Production Release v1.0.0',
    name: 'Dream Wave AI',
  };
}

module.exports = {
  APP_VERSION: version || '1.0.0',
  resolveReleaseChannel,
  getReleaseInfo,
};

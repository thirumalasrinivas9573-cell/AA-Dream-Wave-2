/**
 * Fire-and-forget platform event emission for cross-module personalization.
 * Never throws into request handlers.
 */
async function safeEmit(user, event) {
  try {
    const personalization = require('../services/personalizationIntelligenceService');
    return await personalization.emitEvent(user, event);
  } catch {
    return null;
  }
}

module.exports = { safeEmit };

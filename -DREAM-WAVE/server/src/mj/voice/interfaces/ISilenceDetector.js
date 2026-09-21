/**
 * Silence detection interface (extension point)
 * @module mj/voice/interfaces/ISilenceDetector
 */

class ISilenceDetector {
  /**
   * @param {Buffer|ArrayBuffer} audio
   * @returns {Promise<Object>} { isSilent, durationMs, threshold }
   */
  async detect(_audio) {
    return { isSilent: false, durationMs: 0, threshold: 0.01 }
  }
}

module.exports = { ISilenceDetector }

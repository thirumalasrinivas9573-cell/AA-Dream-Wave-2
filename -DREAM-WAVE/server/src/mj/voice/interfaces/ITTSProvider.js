/**
 * Text-to-Speech Provider Interface
 * @module mj/voice/interfaces/ITTSProvider
 */

class ITTSProvider {
  /** @returns {string} */
  get name() { throw new Error('ITTSProvider.name required') }

  /** @returns {boolean} */
  isAvailable() { throw new Error('ITTSProvider.isAvailable required') }

  /**
   * Synthesize speech from text.
   * @param {Object} input - { text, voiceProfile, pitch, speed, emotion, volume }
   * @returns {Promise<Object>} { audio, format, durationMs, metadata }
   */
  async synthesize(_input) {
    throw new Error('ITTSProvider.synthesize required')
  }

  /**
   * Stream synthesized audio chunks.
   * @param {Object} input
   * @returns {AsyncIterable<Object>} { chunk, format, isFinal }
   */
  async *streamSynthesize(_input) {
    throw new Error('ITTSProvider.streamSynthesize required')
    yield undefined
  }

  /** @returns {Object[]} Available voice profiles */
  getVoiceProfiles() {
    return []
  }
}

module.exports = { ITTSProvider }

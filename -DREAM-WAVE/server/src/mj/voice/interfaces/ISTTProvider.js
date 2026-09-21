/**
 * Speech-to-Text Provider Interface
 * @module mj/voice/interfaces/ISTTProvider
 */

class ISTTProvider {
  /** @returns {string} */
  get name() { throw new Error('ISTTProvider.name required') }

  /** @returns {boolean} */
  isAvailable() { throw new Error('ISTTProvider.isAvailable required') }

  /**
   * Transcribe audio to text (final).
   * @param {Object} input - { audio, format, language }
   * @returns {Promise<Object>} { text, confidence, language, isFinal }
   */
  async transcribe(_input) {
    throw new Error('ISTTProvider.transcribe required')
  }

  /**
   * Stream transcription with interim results.
   * @param {Object} input
   * @returns {AsyncIterable<Object>} { text, isFinal, confidence }
   */
  async *streamTranscribe(_input) {
    throw new Error('ISTTProvider.streamTranscribe required')
    yield undefined
  }

  /** @returns {string[]} Supported languages */
  getSupportedLanguages() {
    return ['en']
  }
}

module.exports = { ISTTProvider }

/**
 * Noise filtering interface (extension point)
 * @module mj/voice/interfaces/INoiseFilter
 */

class INoiseFilter {
  /** @param {Buffer|ArrayBuffer} audio @returns {Promise<Buffer|ArrayBuffer>} */
  async filter(_audio) {
    return _audio
  }
}

module.exports = { INoiseFilter }

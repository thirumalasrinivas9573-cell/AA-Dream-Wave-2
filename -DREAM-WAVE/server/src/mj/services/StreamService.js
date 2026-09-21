/**
 * MJ Stream Service
 * Architecture for streaming responses (stub).
 * @module mj/services/StreamService
 */

const { EventEmitter } = require('events')
const { MJLogger } = require('../logger')

class StreamService extends EventEmitter {
  constructor() {
    super()
    this._logger = MJLogger.child('StreamService')
    this._activeStreams = new Map()
  }

  /**
   * Create a new stream channel.
   * @param {string} streamId
   * @returns {Object}
   */
  createStream(streamId) {
    const stream = {
      id: streamId,
      chunks: [],
      closed: false,
      createdAt: Date.now(),
    }
    this._activeStreams.set(streamId, stream)
    this._logger.debug('Stream created (stub)', { streamId })
    return stream
  }

  /**
   * Push chunk to stream.
   * @param {string} streamId
   * @param {*} chunk
   */
  push(streamId, chunk) {
    const stream = this._activeStreams.get(streamId)
    if (!stream || stream.closed) return false
    stream.chunks.push(chunk)
    this.emit('chunk', { streamId, chunk })
    return true
  }

  /** @param {string} streamId */
  close(streamId) {
    const stream = this._activeStreams.get(streamId)
    if (stream) stream.closed = true
    this.emit('close', { streamId })
  }
}

module.exports = { StreamService }

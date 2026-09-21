/**
 * MJ Brain Context
 * Shared brain state container.
 * @module mj/brain/BrainContext
 */

class BrainContext {
  constructor() {
    this._state = {
      activeThoughts: [],
      workingHypothesis: null,
      lastReasoning: null,
    }
  }

  /** @returns {Object} */
  getState() {
    return { ...this._state }
  }

  /** @param {Object} reasoning */
  setLastReasoning(reasoning) {
    this._state.lastReasoning = reasoning
  }

  clear() {
    this._state = {
      activeThoughts: [],
      workingHypothesis: null,
      lastReasoning: null,
    }
  }
}

module.exports = { BrainContext }

/**
 * MJ State Machine
 * Reusable state transition manager for MJ lifecycle and processing states.
 * @module mj/state/StateMachine
 */

const { MJ_STATES, MJ_EVENTS } = require('../constants')
const { isValidTransition } = require('./MJStates')
const { getEventBus } = require('../events')
const { MJLogger } = require('../logger')

class StateMachine {
  constructor(initialState = MJ_STATES.IDLE) {
    this._currentState = initialState
    this._previousState = null
    this._history = []
    this._logger = MJLogger.child('StateMachine')
    this._eventBus = getEventBus()
  }

  /** @returns {string} */
  get currentState() {
    return this._currentState
  }

  /** @returns {string|null} */
  get previousState() {
    return this._previousState
  }

  /** @returns {Array<{from: string, to: string, timestamp: number}>} */
  get history() {
    return [...this._history]
  }

  /**
   * Attempt a state transition.
   * @param {string} nextState
   * @param {Object} [meta]
   * @returns {{ success: boolean, from: string, to: string, reason?: string }}
   */
  transition(nextState, meta = {}) {
    const from = this._currentState

    if (from === nextState) {
      return { success: true, from, to: nextState }
    }

    if (!isValidTransition(from, nextState)) {
      this._logger.warning(`Invalid transition: ${from} → ${nextState}`, meta)
      return {
        success: false,
        from,
        to: nextState,
        reason: `Invalid transition from ${from} to ${nextState}`,
      }
    }

    this._previousState = from
    this._currentState = nextState
    this._history.push({ from, to: nextState, timestamp: Date.now(), ...meta })

    this._eventBus.emitEvent(MJ_EVENTS.STATE_CHANGED, {
      from,
      to: nextState,
      ...meta,
    })

    this._logger.debug(`State transition: ${from} → ${nextState}`)
    return { success: true, from, to: nextState }
  }

  /**
   * Force transition (bypass validation) — use only for error recovery.
   * @param {string} nextState
   * @param {Object} [meta]
   */
  forceTransition(nextState, meta = {}) {
    const from = this._currentState
    this._previousState = from
    this._currentState = nextState
    this._history.push({
      from,
      to: nextState,
      timestamp: Date.now(),
      forced: true,
      ...meta,
    })
    this._eventBus.emitEvent(MJ_EVENTS.STATE_CHANGED, { from, to: nextState, forced: true, ...meta })
    return { success: true, from, to: nextState }
  }

  /** Reset to idle state. */
  reset() {
    return this.transition(MJ_STATES.IDLE)
  }

  /** @param {string} state */
  is(state) {
    return this._currentState === state
  }

  /** @param {string[]} states */
  isOneOf(states) {
    return states.includes(this._currentState)
  }
}

module.exports = { StateMachine }

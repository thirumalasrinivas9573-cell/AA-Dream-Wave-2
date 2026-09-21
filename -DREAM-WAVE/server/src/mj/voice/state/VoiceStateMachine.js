/**
 * MJ Voice State Machine — event-driven voice lifecycle
 * @module mj/voice/state/VoiceStateMachine
 */

const { VOICE_STATES, VOICE_EVENTS } = require('../constants')
const { getEventBus } = require('../../events')
const { MJLogger } = require('../../logger')

const VOICE_TRANSITIONS = {
  [VOICE_STATES.SLEEPING]: [
    VOICE_STATES.WAKE_DETECTION,
    VOICE_STATES.LISTENING,
    VOICE_STATES.OFFLINE,
    VOICE_STATES.MUTED,
    VOICE_STATES.ERROR,
  ],
  [VOICE_STATES.WAKE_DETECTION]: [VOICE_STATES.LISTENING, VOICE_STATES.SLEEPING, VOICE_STATES.ERROR],
  [VOICE_STATES.LISTENING]: [VOICE_STATES.UNDERSTANDING, VOICE_STATES.SLEEPING, VOICE_STATES.MUTED, VOICE_STATES.ERROR],
  [VOICE_STATES.UNDERSTANDING]: [VOICE_STATES.THINKING, VOICE_STATES.LISTENING, VOICE_STATES.ERROR],
  [VOICE_STATES.THINKING]: [VOICE_STATES.PLANNING, VOICE_STATES.SPEAKING, VOICE_STATES.WAITING, VOICE_STATES.ERROR],
  [VOICE_STATES.PLANNING]: [VOICE_STATES.WORKING, VOICE_STATES.SPEAKING, VOICE_STATES.ERROR],
  [VOICE_STATES.WORKING]: [VOICE_STATES.SPEAKING, VOICE_STATES.WAITING, VOICE_STATES.ERROR],
  [VOICE_STATES.SPEAKING]: [VOICE_STATES.LISTENING, VOICE_STATES.WAITING, VOICE_STATES.SLEEPING, VOICE_STATES.ERROR],
  [VOICE_STATES.WAITING]: [VOICE_STATES.LISTENING, VOICE_STATES.SLEEPING, VOICE_STATES.ERROR],
  [VOICE_STATES.OFFLINE]: [VOICE_STATES.SLEEPING, VOICE_STATES.ERROR],
  [VOICE_STATES.MUTED]: [VOICE_STATES.LISTENING, VOICE_STATES.SLEEPING, VOICE_STATES.ERROR],
  [VOICE_STATES.ERROR]: [VOICE_STATES.SLEEPING, VOICE_STATES.LISTENING, VOICE_STATES.OFFLINE],
}

class VoiceStateMachine {
  constructor() {
    this._logger = MJLogger.child('Voice:StateMachine')
    this._eventBus = getEventBus()
    this._state = VOICE_STATES.SLEEPING
    this._previousState = null
    this._history = []
  }

  get currentState() { return this._state }
  get previousState() { return this._previousState }

  transition(toState, meta = {}) {
    const from = this._state
    const allowed = VOICE_TRANSITIONS[from] || []

    if (!allowed.includes(toState)) {
      this._logger.warning('Invalid voice state transition', { from, to: toState })
      return { success: false, from, to: toState, reason: 'invalid_transition' }
    }

    this._previousState = from
    this._state = toState
    this._history.push({ from, to: toState, timestamp: Date.now(), ...meta })

    this._eventBus.emitEvent(VOICE_EVENTS.VOICE_STATE_CHANGED, {
      from,
      to: toState,
      ...meta,
    })

    this._logger.debug(`Voice state: ${from} → ${toState}`, meta)
    return { success: true, from, to: toState }
  }

  forceTransition(toState, meta = {}) {
    const from = this._state
    this._previousState = from
    this._state = toState
    this._history.push({ from, to: toState, forced: true, timestamp: Date.now(), ...meta })
    this._eventBus.emitEvent(VOICE_EVENTS.VOICE_STATE_CHANGED, { from, to: toState, forced: true, ...meta })
    return { success: true, from, to: toState, forced: true }
  }

  getHistory(limit = 20) {
    return this._history.slice(-limit)
  }

  reset() {
    this._previousState = this._state
    this._state = VOICE_STATES.SLEEPING
  }
}

module.exports = { VoiceStateMachine, VOICE_TRANSITIONS, VOICE_STATES }

/**
 * @module mj/events
 */
const { EventBus, getEventBus } = require('./EventBus')
const { MJ_EVENTS, createEventPayload } = require('./MJEvents')

module.exports = {
  EventBus,
  getEventBus,
  MJ_EVENTS,
  createEventPayload,
}

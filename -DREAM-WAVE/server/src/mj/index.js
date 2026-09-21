/**
 * MJ — Personal AI Operating System
 * Dream Wave AI — Core Foundation Module
 *
 * Completely isolated from Dream Wave. Zero impact on existing features.
 *
 * @module mj
 */

const { MJController, getMJ } = require('./MJController')
const constants = require('./constants')
const events = require('./events')
const state = require('./state')
const memory = require('./memory')
const planner = require('./planner')
const agents = require('./agents')
const core = require('./core')
const services = require('./services')
const config = require('./config')
const errors = require('./errors')
const logger = require('./logger')
const security = require('./security')
const hooks = require('./hooks')
const middleware = require('./middleware')
const utils = require('./utils')
const interfaces = require('./interfaces')
const context = require('./context')
const conversation = require('./conversation')
const brain = require('./brain')
const ai = require('./ai')
const voice = require('./voice')
const orchestrator = require('./orchestrator')
const gateway = require('./gateway')

const MJ = {
  /** Singleton controller — primary entry point */
  controller: getMJ(),

  /** Factory for new controller instances */
  createController: () => new MJController(),

  /** Module version */
  version: constants.MJ_VERSION,

  /** Subsystem exports */
  constants,
  events,
  state,
  memory,
  planner,
  agents,
  core,
  services,
  config,
  errors,
  logger,
  security,
  hooks,
  middleware,
  utils,
  interfaces,
  context,
  conversation,
  brain,
  ai,
  voice,
  orchestrator,
  gateway,

  /** Convenience API — delegates to singleton controller */
  start: () => getMJ().start(),
  stop: () => getMJ().stop(),
  sleep: () => getMJ().sleep(),
  wake: () => getMJ().wake(),
  processCommand: (input, options) => getMJ().processCommand(input, options),
  getState: () => getMJ().getState(),
  getMemory: () => getMJ().getMemory(),
  clearMemory: () => getMJ().clearMemory(),
  registerAgent: (agent) => getMJ().registerAgent(agent),
  unregisterAgent: (type) => getMJ().unregisterAgent(type),
  getActiveAgents: () => getMJ().getActiveAgents(),
  getAllAgents: () => getMJ().getAllAgents(),
  reset: () => getMJ().reset(),
  getHealth: () => getMJ().getHealth(),
  getUptime: () => getMJ().getUptime(),
  getAIBrainStatus: () => getMJ().getAIBrainStatus(),
}

module.exports = MJ
module.exports.default = MJ
module.exports.MJ = MJ
module.exports.MJController = MJController
module.exports.getMJ = getMJ

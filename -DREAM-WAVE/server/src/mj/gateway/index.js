/**
 * MJ API Gateway
 * The ONLY public backend interface for MJ.
 * @module mj/gateway
 */
const { GatewayOrchestrator, getGateway } = require('./GatewayOrchestrator')
const { ApiRequestPipeline, GATEWAY_STAGES } = require('./ApiRequestPipeline')
const { buildApiResponse } = require('./ApiResponse')
const gatewayErrors = require('./ApiErrors')
const gatewayMiddleware = require('./middleware')

function createMJGatewayRouterHandlers() {
  const gateway = getGateway()
  return {
    process: gateway.processHandler(),
    status: gateway.statusHandler(),
    health: gateway.healthHandler(),
    agents: gateway.agentsHandler(),
    agentById: gateway.agentByIdHandler(),
    agentRegister: gateway.agentRegisterHandler(),
    agentUnregister: gateway.agentUnregisterHandler(),
    agentExecute: gateway.agentExecuteHandler(),
    orchestratorRun: gateway.orchestratorRunHandler(),
    orchestratorStatus: gateway.orchestratorStatusHandler(),
    orchestratorMetrics: gateway.orchestratorMetricsHandler(),
    orchestratorHealth: gateway.orchestratorHealthHandler(),
    memory: gateway.memoryHandler(),
    memorySearch: gateway.memorySearchHandler(),
    memoryRecent: gateway.memoryRecentHandler(),
    memoryProjects: gateway.memoryProjectsHandler(),
    memoryPreferences: gateway.memoryPreferencesHandler(),
    memorySave: gateway.memorySaveHandler(),
    memoryUpdate: gateway.memoryUpdateHandler(),
    memoryArchive: gateway.memoryArchiveHandler(),
    memoryDelete: gateway.memoryDeleteHandler(),
    voiceStatus: gateway.voiceStatusHandler(),
    voiceWake: gateway.voiceWakeHandler(),
    voiceSleep: gateway.voiceSleepHandler(),
    voiceListen: gateway.voiceListenHandler(),
    voiceStop: gateway.voiceStopHandler(),
    voiceSettingsGet: gateway.voiceSettingsGetHandler(),
    voiceSettingsPut: gateway.voiceSettingsPutHandler(),
    voiceSpeak: gateway.voiceSpeakHandler(),
    wake: gateway.wakeHandler(),
    sleep: gateway.sleepHandler(),
    reset: gateway.resetHandler(),
  }
}

function applyGatewayMiddleware(router) {
  const { requestIdMiddleware, apiKeyMiddleware, permissionMiddleware, createMJRateLimiter } = gatewayMiddleware
  router.use(requestIdMiddleware)
  router.use(createMJRateLimiter())
  router.use(apiKeyMiddleware)
  router.use(permissionMiddleware)
  return router
}

module.exports = {
  GatewayOrchestrator,
  getGateway,
  ApiRequestPipeline,
  GATEWAY_STAGES,
  buildApiResponse,
  createMJGatewayRouterHandlers,
  applyGatewayMiddleware,
  middleware: gatewayMiddleware,
  errors: gatewayErrors,
}

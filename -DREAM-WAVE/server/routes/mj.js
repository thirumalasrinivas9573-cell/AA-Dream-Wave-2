/**
 * MJ API Gateway Routes
 * The ONLY public backend interface for MJ.
 * Mounted at /api/mj — does not modify any existing Dream Wave routes.
 *
 * @module routes/mj
 */

const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const { createMJGatewayRouterHandlers, applyGatewayMiddleware } = require('../src/mj/gateway')

// MJ operates on private user memory and agents; every route requires the
// canonical Dream Wave session. Gateway API keys are an additional control.
router.use(auth)
applyGatewayMiddleware(router)

const handlers = createMJGatewayRouterHandlers()

router.post('/process', handlers.process)
router.get('/status',   handlers.status)
router.get('/health',   handlers.health)
router.get('/agents',   handlers.agents)
router.get('/agents/:id', handlers.agentById)
router.post('/agents/register', handlers.agentRegister)
router.post('/agents/unregister', handlers.agentUnregister)
router.post('/agents/execute', handlers.agentExecute)
router.post('/orchestrator/run', handlers.orchestratorRun)
router.get('/orchestrator/status', handlers.orchestratorStatus)
router.get('/orchestrator/metrics', handlers.orchestratorMetrics)
router.get('/orchestrator/health', handlers.orchestratorHealth)
router.get('/memory',   handlers.memory)
router.get('/memory/search', handlers.memorySearch)
router.get('/memory/recent', handlers.memoryRecent)
router.get('/memory/projects', handlers.memoryProjects)
router.get('/memory/preferences', handlers.memoryPreferences)
router.post('/memory/save', handlers.memorySave)
router.post('/memory/update', handlers.memoryUpdate)
router.post('/memory/archive', handlers.memoryArchive)
router.post('/memory/delete', handlers.memoryDelete)
router.get('/voice/status', handlers.voiceStatus)
router.post('/voice/wake', handlers.voiceWake)
router.post('/voice/sleep', handlers.voiceSleep)
router.post('/voice/listen', handlers.voiceListen)
router.post('/voice/stop', handlers.voiceStop)
router.get('/voice/settings', handlers.voiceSettingsGet)
router.put('/voice/settings', handlers.voiceSettingsPut)
router.post('/voice/speak', handlers.voiceSpeak)
router.post('/wake',    handlers.wake)
router.post('/sleep',   handlers.sleep)
router.post('/reset',   handlers.reset)

module.exports = router

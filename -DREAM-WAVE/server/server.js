require('dotenv').config()
const dns = require('dns')
try { dns.setServers(['8.8.8.8', '1.1.1.1']) } catch {}

const express   = require('express')
const http      = require('http')
const { Server} = require('socket.io')
const mongoose  = require('mongoose')
const cors      = require('cors')
const helmet    = require('helmet')
const rateLimit = require('express-rate-limit')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const User = require('./models/User')
const { isSessionFamilyActive } = require('./utils/tokenService')
const { validateEmailEnv } = require('./services/emailService')
const { validateTwilioEnv } = require('./services/twilioVerify')
const { validateCoreEnv } = require('./utils/validateEnv')
const { requestId, rejectMongoOperators } = require('./middleware/requestSecurity')
const { fail: apiFail } = require('./utils/apiResponse')

let compression
try { compression = require('compression') } catch { compression = null }

// ── Logger ────────────────────────────────────────────────────────────────────
const log = {
  info:  (...a) => console.log (`[${new Date().toISOString()}] INFO `, ...a),
  warn:  (...a) => console.warn (`[${new Date().toISOString()}] WARN `, ...a),
  error: (...a) => console.error(`[${new Date().toISOString()}] ERROR`, ...a),
}

try {
  const warnings = validateCoreEnv({ fatalInProduction: true })
  warnings.forEach((warning) => log.warn(warning))
} catch (err) {
  log.error(err.message)
  process.exit(1)
}

// Validate Resend / email configuration (fatal in production)
try {
  validateEmailEnv({ fatalInProduction: true })
} catch (err) {
  log.error(err.message)
  process.exit(1)
}

// Validate Twilio Verify (fatal in production)
try {
  validateTwilioEnv({ fatalInProduction: true })
} catch (err) {
  log.error(err.message)
  process.exit(1)
}

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes      = require('./routes/auth')
const aiRoutes        = require('./routes/aiRoutes')
const aiExtRoutes     = require('./routes/ai')
const goalRoutes      = require('./routes/goals')
const taskRoutes      = require('./routes/tasks')
const communityRoutes = require('./routes/community')
const paymentRoutes   = require('./routes/payment')
const adminRoutes     = require('./routes/admin')
const institutionRoutes = require('./routes/institution')
const companyRoutes   = require('./routes/company')
const discoveryRoutes = require('./routes/discovery')
const searchRoutes    = require('./routes/search')
const libraryRoutes   = require('./routes/library')
const interactionRoutes = require('./routes/interaction')
const careerRoutes     = require('./routes/career')
const dashboardRoutes  = require('./routes/dashboard')
const reportRoutes    = require('./routes/report')
const roadmapRoutes   = require('./routes/roadmap')
const booksRoutes     = require('./routes/books')
const dailyRoutes     = require('./routes/daily')
const mentorRoutes    = require('./routes/mentor')
const profileRoutes   = require('./routes/profile')
const lessonRoutes    = require('./routes/lesson')
const mjRoutes        = require('./routes/mj')
const partnershipRoutes = require('./routes/partnerships')
const platformNotificationRoutes = require('./routes/platformNotifications')
const recruitmentRoutes = require('./routes/recruitment')
const { setSocketIo } = require('./services/socketRegistry')

const app    = express()
const server = http.createServer(app)
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY)
}

// ── CORS origin resolver ──────────────────────────────────────────────────────
// Localhost + explicit CLIENT_URL / EXTRA_CORS_ORIGINS (comma-separated)
const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true) // curl / mobile / server-to-server
  const extras = String(process.env.EXTRA_CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const localAllowed = process.env.NODE_ENV !== 'production' && (
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
    /\.trycloudflare\.com$/.test(origin)
  )
  const ok =
    localAllowed ||
    /\.netlify\.app$/.test(origin) ||
    /\.netlify\.live$/.test(origin) ||
    (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) ||
    extras.includes(origin)

  if (ok) return callback(null, true)
  log.warn(`CORS blocked: ${origin}`)
  callback(new Error(`CORS: ${origin} not allowed`))
}

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: corsOrigin, credentials: true },
  transports: ['websocket', 'polling'],
})
app.set('io', io)
setSocketIo(io)

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token
  if (!token) return next(new Error('Unauthorized'))
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.userId = decoded.id?.toString?.() || String(decoded.id)
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

io.use(async (socket, next) => {
  try {
    const bearer = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '')
    if (!bearer) return next(new Error('Authentication required'))
    const decoded = jwt.verify(bearer, process.env.JWT_SECRET, {
      issuer: 'dream-wave-api',
      audience: 'dream-wave-client',
    })
    if (decoded.type !== 'access' || !decoded.sid) return next(new Error('Invalid session'))
    if (!await isSessionFamilyActive(decoded.id, decoded.sid)) return next(new Error('Session revoked'))
    const user = await User.findById(decoded.id).select('_id role suspended')
    if (!user || user.suspended) return next(new Error('Account unavailable'))
    socket.user = user
    return next()
  } catch {
    return next(new Error('Invalid session'))
  }
})

io.on('connection', socket => {
  log.info(`Socket connected: ${socket.id}`)
  if (socket.user?._id) {
    socket.join(`user:${socket.user._id}`)
  } else if (socket.userId) {
    socket.join(`user:${socket.userId}`)
  }
  socket.on('join', userId => {
    const uid = socket.user?._id?.toString() || socket.userId
    if (userId && uid && userId.toString() === uid.toString()) {
      socket.join(`user:${userId}`)
    }
  })
  socket.on('disconnect', () => { log.info(`Socket disconnected: ${socket.id}`) })
})

// ── Middleware ────────────────────────────────────────────────────────────────
if (compression) app.use(compression())
app.use(requestId)
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(cookieParser())

// Rate limiters
// Session maintenance (/refresh, /me, logout) is not a brute-force vector — exclude it
// from the strict auth limiter so tab reloads do not lock users out of login/OTP.
const isProd = process.env.NODE_ENV === 'production'
const skipAuthSessionPaths = (req) =>
  /^\/(refresh|logout|logout-all|me|sessions|profile|login-history)(\/|$)/.test(req.path || '')
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 40 : 300,
  standardHeaders: true,
  skip: skipAuthSessionPaths,
  message: { success: false, message: 'Too many auth attempts. Please wait and try again.' },
})
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 100,
  standardHeaders: true,
  message: { success: false, message: 'Too many login attempts. Please wait and try again.' },
})
const aiLimiter   = rateLimit({ windowMs: 60*1000,    max: 40,  standardHeaders: true, message: { success: false, message: 'AI rate limit. Please wait.' } })
const apiLimiter  = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  skip: (req) => req.originalUrl?.startsWith('/api/payment/webhook'),
  message: { success: false, message: 'Too many requests.' },
})
app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authLimiter)
app.use('/api/ai',   aiLimiter)
app.use('/api/mentor', aiLimiter)
app.use('/api',      apiLimiter)

// Stripe webhook needs raw body BEFORE json parser
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }))

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(rejectMongoOperators)

// Request logger
app.use((req, _res, next) => { log.info(`${req.id} ${req.method} ${req.path}`); next() })

// ── MongoDB ───────────────────────────────────────────────────────────────────
const connectDB = async (attempt = 1) => {
  let url = process.env.MONGODB_URL || process.env.MONGODB_URI
  if (!url) { log.error('MONGODB_URL (or MONGODB_URI) not set'); return }
  try {
    try { dns.setServers(['8.8.8.8', '1.1.1.1']) } catch {}
    const conn = await mongoose.connect(url, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
      maxPoolSize:              10,
    })
    log.info(`MongoDB connected: ${conn.connection.host}`)
    try {
      const User = require('./models/User')
      const { ensureMultiPortalUserIndexes } = require('./utils/ensureMultiPortalIndexes')
      const { ensureCoreIndexes } = require('./utils/ensureCoreIndexes')
      await ensureMultiPortalUserIndexes(mongoose, User)
      await ensureCoreIndexes(mongoose)
    } catch (idxErr) {
      log.error(`Database index ensure failed: ${idxErr.message}`)
      if (process.env.NODE_ENV === 'production') throw idxErr
    }
  } catch (err) {
    log.error(`MongoDB attempt ${attempt}/2: ${err.message}`)
    if (attempt < 2) {
      setTimeout(() => connectDB(attempt + 1), 2000)
    } else if (process.env.NODE_ENV !== 'production') {
      log.warn('Attempting in-memory MongoDB fallback for local development...')
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server')
        const memory = await MongoMemoryServer.create()
        const memUri = memory.getUri('dreamwave_dev')
        const conn = await mongoose.connect(memUri)
        log.info(`In-memory MongoDB connected: ${conn.connection.host}`)
        const User = require('./models/User')
        const { ensureMultiPortalUserIndexes } = require('./utils/ensureMultiPortalIndexes')
        const { ensureCoreIndexes } = require('./utils/ensureCoreIndexes')
        await ensureMultiPortalUserIndexes(mongoose, User)
        await ensureCoreIndexes(mongoose)
      } catch (memErr) {
        log.error(`In-memory MongoDB fallback failed: ${memErr.message}`)
      }
    }
  }
}
connectDB()


// ── Health ────────────────────────────────────────────────────────────────────
// Minimal probe for Render / load balancers — no secrets, no DB credentials.
const healthPayload = () => ({ status: 'ok' })
app.get('/health', (_req, res) => res.json(healthPayload()))
app.get('/api/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState
  const mongo = mongoState === 1 ? 'up' : mongoState === 2 ? 'connecting' : 'down'
  const status = mongo === 'up' ? 'ok' : 'degraded'
  return res.json({
    success: true,
    status,
    mongo,
    version: require('./package.json').version,
    time: new Date().toISOString(),
  })
})
app.get('/ready', async (_req, res) => {
  const ready = mongoose.connection.readyState === 1
  if (!ready) {
    return res.status(503).json({ status: 'NOT_READY', mongo: mongoose.connection.readyState })
  }
  return res.json({ status: 'READY', mongo: 'connected', ts: Date.now() })
})
app.get('/api/test',  (_req, res) => res.json({ success: true, message: 'Dream Wave API is running' }))

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes)
app.use('/api/ai/orchestration', require('./routes/multiAgentOrchestration'))
app.use('/api/personalization', require('./routes/contextPersonalization'))
app.use('/api/search', require('./routes/knowledgeDiscovery'))
app.use('/api/research/workspace', require('./routes/researchWorkspace'))
app.use('/api/learning', require('./routes/adaptiveLearning'))
app.use('/api/adaptive', require('./routes/adaptive'))
app.use('/api/projects', require('./routes/projectIntelligence'))
app.use('/api/career/readiness', require('./routes/careerReadiness'))
app.use('/api/opportunities/intelligence', require('./routes/opportunityIntelligence'))
app.use('/api/applications/workspace', require('./routes/applicationIntelligence'))
app.use('/api/career/command-center', require('./routes/careerOperatingSystem'))
app.use('/api/career/execution', require('./routes/goalExecution'))
app.use('/api/ai',        aiRoutes)
app.use('/api/ai',        aiExtRoutes)
app.use('/api/goals',     goalRoutes)
app.use('/api/tasks',     taskRoutes)
app.use('/api/community', communityRoutes)
app.use('/api/payment',   paymentRoutes)
app.use('/api/admin',     adminRoutes)
// Lasya institution sub-modules (specific paths before general /api/institution)
app.use('/api/institution/students', require('./routes/institutionStudents'))
app.use('/api/institution/placements', require('./routes/institutionPlacements'))
app.use('/api/institution/programs', require('./routes/institutionPrograms'))
app.use('/api/company/programs', require('./routes/institutionPrograms'))
app.use('/api/institution/research', require('./routes/institutionResearch'))
app.use('/api/institution/incubation', require('./routes/institutionIncubation'))
app.use('/api/institution/alumni', require('./routes/institutionAlumni'))
app.use('/api/institution/command-center', require('./routes/institutionCommandCenter'))
app.use('/api/institution', institutionRoutes)
app.use('/api/company',   companyRoutes)
app.use('/api/discovery', discoveryRoutes)
app.use('/api/search',    searchRoutes)
app.use('/api/library',   libraryRoutes)
app.use('/api/interaction', interactionRoutes)
app.use('/api/career',    careerRoutes)
app.use('/api/academics', require('./routes/academics'))
app.use('/api/research', require('./routes/research'))
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/activity', require('./routes/activity'))
app.use('/api/intelligence', require('./routes/intelligence'))
app.use('/api/agent', aiLimiter, require('./routes/agentOrchestration'))
app.use('/api/memory', require('./routes/memory'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/content-reports', require('./routes/contentReports'))
app.use('/api/report',    reportRoutes)
app.use('/api/roadmap',   roadmapRoutes)
app.use('/api/books',     booksRoutes)
app.use('/api/daily',     dailyRoutes)
app.use('/api/mentor',    mentorRoutes)
app.use('/api/planner',   require('./routes/planner'))
app.use('/api/profile',   profileRoutes)
app.use('/api/lesson',    lessonRoutes)
app.use('/api/mj',        mjRoutes)
app.use('/api/partnerships', partnershipRoutes)
app.use('/api/platform-notifications', platformNotificationRoutes)
app.use('/api/recruitment', recruitmentRoutes)
app.use('/api/institution/foundation', require('./routes/institutionFoundation'))
app.use('/api/institution/intelligence', require('./routes/institutionIntelligence'))
app.use('/api/institution/bi', require('./routes/institutionBusinessIntelligence'))
app.use('/api/student/recruitment', require('./routes/studentRecruitment'))
app.use('/api/student/opportunities', require('./routes/studentOpportunities'))
app.use('/api/student/programs', require('./routes/studentPrograms'))
app.use('/api/student/ecosystem', require('./routes/studentEcosystem'))
app.use('/api/ecosystem/intelligence', require('./routes/ecosystemIntelligence'))
app.use('/api/operations', require('./routes/ecosystemAutomation'))
app.use('/api/institution/executive-intelligence', require('./routes/executiveIntelligence'))
app.use('/api/student/talent', require('./routes/studentTalent'))
app.use('/api/student/career-copilot', require('./routes/careerCopilot'))
app.use('/api/marketplace', require('./routes/talentMarketplace'))
app.use('/api/company/talent', require('./routes/companyTalent'))
app.use('/api/institution/talent-intelligence', require('./routes/institutionTalentIntelligence'))
app.use('/api/institution/campus-command-center', require('./routes/campusCommandCenter'))
app.use('/api/events', require('./routes/events'))

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  log.error(`${req.method} ${req.path} →`, err.message)
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map(v => v.message).join(', ')
    return res.status(400).json({ success: false, message: msg })
  }
  if (err.code === 11000) {
    const key = err.keyPattern || {}
    if (key.email && key.role) {
      const role = err.keyValue?.role || 'portal'
      const label = role.charAt(0).toUpperCase() + String(role).slice(1)
      return res.status(400).json({
        success: false,
        message: `This ${label} account already exists.`,
        code: 'PORTAL_EXISTS',
      })
    }
    return res.status(400).json({ success: false, message: 'Account already registered for this portal.' })
  }
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' })
  if (err.message?.startsWith('CORS'))
    return res.status(403).json({ success: false, message: err.message })
  const status = err.statusCode || 500
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal server error.' : (err.message || 'Request failed.'),
    code: err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
})

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use('*', (req, res) => apiFail(res, 404, `Route ${req.originalUrl} not found`, 'NOT_FOUND'))

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5001', 10)
server.listen(PORT, '0.0.0.0', () =>
  log.info(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
)

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  log.info(`${signal} received — shutting down gracefully`)
  server.close(async () => {
    try {
      await mongoose.connection.close(false)
      log.info('MongoDB connection closed')
    } catch (err) {
      log.warn('MongoDB close error:', err?.message)
    }
    process.exit(0)
  })
  setTimeout(() => {
    log.error('Forced shutdown after timeout')
    process.exit(1)
  }, 15000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('unhandledRejection', err => log.warn('Unhandled rejection:', err?.message))
process.on('uncaughtException',  err => { log.error('Uncaught exception:', err?.message); process.exit(1) })

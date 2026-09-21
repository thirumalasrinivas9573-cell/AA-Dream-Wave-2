const mongoose = require('mongoose');
const logger = require('../utils/logger');

let listenersBound = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  if (!listenersBound) {
    listenersBound = true;
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  }

  const conn = await mongoose.connect(uri, {
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 20,
    minPoolSize: Number(process.env.MONGO_POOL_MIN) || 0,
    maxConnecting: Number(process.env.MONGO_MAX_CONNECTING) || 5,
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_MS) || 10000,
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
    heartbeatFrequencyMS: Number(process.env.MONGO_HEARTBEAT_MS) || 10000,
    maxIdleTimeMS: Number(process.env.MONGO_IDLE_MS) || 60000,
  });
  logger.info('MongoDB connected', {
    host: conn.connection.host,
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE) || 20,
  });
  return conn;
};

/** Timed ping used by readiness probes. */
async function pingDatabase({ timeoutMs = 2000 } = {}) {
  if (mongoose.connection.readyState !== 1) {
    return { ok: false, reason: 'not_connected', readyState: mongoose.connection.readyState };
  }
  const started = Date.now();
  try {
    const admin = mongoose.connection.db.admin();
    await Promise.race([
      admin.ping(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('db_ping_timeout')), Math.max(100, timeoutMs));
      }),
    ]);
    return { ok: true, latencyMs: Date.now() - started, readyState: 1 };
  } catch (err) {
    return {
      ok: false,
      reason: err.message || 'ping_failed',
      latencyMs: Date.now() - started,
      readyState: mongoose.connection.readyState,
    };
  }
}

module.exports = connectDB;
module.exports.pingDatabase = pingDatabase;

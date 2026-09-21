const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { applyTestEnv } = require('./env');

let memory;
let app;

/** Force an isolated DB name so smoke tests never touch the primary app database. */
function withSmokeDbName(uri) {
  try {
    const u = new URL(uri);
    u.pathname = '/dreamwave_smoke_test';
    return u.toString();
  } catch {
    if (uri.includes('?')) {
      return uri.replace(/\/([^/?]*)\?/, '/dreamwave_smoke_test?');
    }
    return `${uri.replace(/\/$/, '')}/dreamwave_smoke_test`;
  }
}

async function isReachable(uri) {
  let conn;
  try {
    conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 4000 });
    await conn.asPromise();
    return true;
  } catch {
    return false;
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {
        /* ignore */
      }
    }
  }
}

async function startMemory() {
  const cacheDir = path.join(__dirname, '..', '.cache', 'mongodb-memory-server');
  memory = await MongoMemoryServer.create({
    binary: { version: '6.0.14', downloadDir: cacheDir },
  });
  return memory.getUri();
}

async function resolveUri() {
  if (process.env.TEST_MONGODB_URI) {
    const uri = withSmokeDbName(process.env.TEST_MONGODB_URI);
    if (!(await isReachable(uri))) {
      throw new Error(`TEST_MONGODB_URI is not reachable`);
    }
    return uri;
  }

  require('dotenv').config({ path: path.join(__dirname, '../../.env') });

  if (process.env.MONGODB_URI && process.env.PREFER_MEMORY_MONGO !== '1') {
    const uri = withSmokeDbName(process.env.MONGODB_URI);
    if (await isReachable(uri)) {
      console.warn('[smoke] Using MONGODB_URI → database dreamwave_smoke_test');
      return uri;
    }
    console.warn('[smoke] MONGODB_URI not reachable — trying MongoMemoryServer');
  }

  try {
    return await startMemory();
  } catch (err) {
    console.warn('[smoke] MongoMemoryServer unavailable:', err.message);
  }

  throw new Error(
    'No test database. Set a reachable TEST_MONGODB_URI / MONGODB_URI, or allow MongoMemoryServer binaries.'
  );
}

async function boot() {
  applyTestEnv();
  const uri = await resolveUri();
  process.env.MONGODB_URI = uri;

  delete require.cache[require.resolve('../../server')];
  delete require.cache[require.resolve('../../config/env')];
  delete require.cache[require.resolve('../../config/db')];

  app = require('../../server');
  const connectDB = require('../../config/db');
  await connectDB();
  return app;
}

async function shutdown() {
  if (!memory && mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.dropDatabase();
    } catch {
      /* ignore */
    }
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (memory) {
    await memory.stop();
    memory = null;
  }
}

function getApp() {
  if (!app) throw new Error('Test app not booted — call boot() in before()');
  return app;
}

module.exports = { boot, shutdown, getApp };

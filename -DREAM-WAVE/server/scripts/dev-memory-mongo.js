/**
 * Development helper: start API with an in-memory MongoDB when local Mongo is unavailable.
 * Usage: node scripts/dev-memory-mongo.js
 * Production should always set MONGODB_URL / MONGODB_URI to a real cluster.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const cacheDir = path.join(__dirname, '..', '.cache', 'mongodb-memory-server');
  const memory = await MongoMemoryServer.create({
    binary: { version: '6.0.14', downloadDir: cacheDir },
  });
  const uri = memory.getUri('dreamwave_integration');
  process.env.MONGODB_URL = uri;
  process.env.MONGODB_URI = uri;
  console.log('[dev-memory-mongo] In-memory MongoDB ready');
  require('../server');
}

main().catch((err) => {
  console.error('[dev-memory-mongo] failed:', err.message);
  process.exit(1);
});

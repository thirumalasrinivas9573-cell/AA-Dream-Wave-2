const http = require('http');
const path = require('path');
const fs = require('fs');
try { require('dns').setServers(['8.8.8.8', '1.1.1.1']); } catch {}

console.log('========================================');

console.log('       MongoDB Connection Test');
console.log('========================================\n');

// 1. Check direct connection to MongoDB via Mongoose
async function testDirectMongo() {
  const envPath = path.join(__dirname, 'server', '.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ server/.env not found');
    return false;
  }

  require(path.join(__dirname, 'server', 'node_modules', 'dotenv')).config({ path: envPath });
  const mongoose = require(path.join(__dirname, 'server', 'node_modules', 'mongoose'));
  const uri = process.env.MONGODB_URL || process.env.MONGODB_URI;

  if (!uri) {
    console.log('❌ No MONGODB_URI or MONGODB_URL found in server/.env');
    return false;
  }

  const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
  console.log('[1/2] Testing direct MongoDB connection...');
  console.log('      URI:', maskedUri);

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('      ✅ Direct MongoDB Connection: SUCCESSFUL');
    console.log('      Cluster Host:', conn.connection.host);
    console.log('      Database Name:', conn.connection.name);
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.log('      ❌ Direct MongoDB Connection: FAILED');
    console.log('      Error:', err.message);
    return false;
  }
}

// 2. Check running backend server API health
function testBackendHealth() {
  return new Promise((resolve) => {
    console.log('\n[2/2] Checking Backend Server (http://localhost:5001/api/health)...');
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/health',
        method: 'GET',
        timeout: 3000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('      ✅ Backend Server: RUNNING');
            console.log('      Server Mongo Status:', response.mongo === 'up' ? '✅ UP' : '⚠️ ' + response.mongo);
            resolve(true);
          } catch {
            console.log('      ⚠️ Server responded, but response was not valid JSON.');
            resolve(false);
          }
        });
      }
    );

    req.on('error', () => {
      console.log('      ℹ️ Backend Server is currently stopped (Run start-dev.bat or RESTART_SERVERS.bat to start)');
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('      ℹ️ Backend Server did not respond within 3s');
      resolve(false);
    });

    req.end();
  });
}

async function run() {
  const mongoOk = await testDirectMongo();
  await testBackendHealth();

  console.log('\n========================================');
  if (mongoOk) {
    console.log('🎉 MongoDB is configured and connecting properly!');
  } else {
    console.log('❌ MongoDB connection failed. Please check network/credentials.');
  }
  console.log('========================================\n');
}

run();


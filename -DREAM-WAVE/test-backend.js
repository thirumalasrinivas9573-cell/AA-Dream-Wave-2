const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/health',
  method: 'GET'
};

console.log('Testing backend at http://localhost:5001/api/health...\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('✅ Backend Status: WORKING');
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (error) => {
  console.log('❌ Backend Status: NOT WORKING');
  console.error('Error:', error.message);
});

req.end();

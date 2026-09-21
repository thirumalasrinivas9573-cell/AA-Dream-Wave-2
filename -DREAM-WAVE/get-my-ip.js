const https = require('https');

console.log('Fetching your current IP address...\n');

https.get('https://api.ipify.org?format=json', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('═══════════════════════════════════════════');
      console.log('  YOUR CURRENT PUBLIC IP ADDRESS');
      console.log('═══════════════════════════════════════════');
      console.log('\n  📍 IP:', response.ip);
      console.log('\n═══════════════════════════════════════════');
      console.log('\nAdd this IP to MongoDB Atlas Network Access:');
      console.log('1. Go to: https://cloud.mongodb.com');
      console.log('2. Click "Network Access" in left menu');
      console.log('3. Click "Add IP Address"');
      console.log('4. Enter this IP:', response.ip);
      console.log('5. Or click "Add Current IP Address"');
      console.log('6. Click "Confirm"');
      console.log('7. Wait 1-2 minutes for it to activate\n');
    } catch (error) {
      console.log('Error:', error.message);
    }
  });
}).on('error', (error) => {
  console.error('Error fetching IP:', error.message);
});

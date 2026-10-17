/**
 * Gemini Integration Verification Script
 * Tests connectivity, text generation, and structured JSON generation.
 * Usage: node scripts/test-gemini.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const gemini = require('../services/geminiService');

async function main() {
  console.log('========================================');
  console.log('  DreamWave Gemini Foundation Test');
  console.log('========================================\n');

  console.log(`Configured Model: ${gemini.getModel()}`);
  console.log(`API Key:          ${gemini.maskApiKey(gemini.getApiKey())}\n`);

  // 1. Test basic connectivity
  console.log('[1/3] Testing API Connectivity...');
  const conn = await gemini.testConnection();
  if (!conn.ok) {
    console.error(`❌ Connection failed: ${conn.message}`);
    process.exit(1);
  }
  console.log(`✅ Connection OK (${conn.latencyMs}ms): "${conn.reply}"\n`);

  // 2. Test chat completion
  console.log('[2/3] Testing Chat Completion...');
  try {
    const chatRes = await gemini.generateChat({
      systemInstruction: 'You are Sage, an elite career mentor in DreamWave.',
      messages: [
        { role: 'user', content: 'Give 1 sentence of encouragement to a student learning to code.' }
      ],
      maxTokens: 1000,
    });
    console.log(`✅ Chat OK (${chatRes.latencyMs}ms): "${chatRes.content}"\n`);
  } catch (err) {
    console.error(`❌ Chat failed: ${err.message} (${err.code})`);
    process.exit(1);
  }

  // 3. Test structured JSON completion
  console.log('[3/3] Testing Structured JSON Generation...');
  try {
    const jsonRes = await gemini.generateStructuredJSON({
      systemInstruction: 'You are a learning architect. Always respond with pure valid JSON.',
      messages: [
        {
          role: 'user',
          content: 'Create a 2-day micro-plan for learning JavaScript promises. Return JSON: {"days": [{"day": 1, "topic": "string", "focus": "string"}]}'
        }
      ],
      maxTokens: 2000,
    });
    console.log(`✅ Structured JSON OK (${jsonRes.latencyMs}ms):`);
    console.log(JSON.stringify(jsonRes.data, null, 2));
    console.log('\n========================================');
    console.log('  ALL GEMINI FOUNDATION CHECKS PASSED!');
    console.log('========================================');
    process.exit(0);
  } catch (err) {
    console.error(`❌ Structured JSON failed: ${err.message} (${err.code})`);
    process.exit(1);
  }
}

main();

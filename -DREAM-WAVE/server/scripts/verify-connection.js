/**
 * Verify MongoDB + Gemini credentials before starting the server.
 * Usage: node scripts/verify-connection.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const { getOpenAI, getApiKey, getModel } = require('../utils/openaiClient')

const mongoUrl = process.env.MONGODB_URL?.trim()
const geminiKey = getApiKey()

async function checkMongo() {
  if (!mongoUrl) {
    console.error('❌ MONGODB_URL is empty — add your MongoDB connection string to server/.env')
    return false
  }
  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 })
    console.log('✅ MongoDB connected:', mongoose.connection.host)
    await mongoose.disconnect()
    return true
  } catch (err) {
    console.error('❌ MongoDB failed:', err.message)
    return false
  }
}

async function checkGemini() {
  if (!geminiKey) {
    console.error('❌ GEMINI_API_KEY is empty — add your Gemini API key to server/.env')
    return false
  }
  try {
    const client = getOpenAI()
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: 'Say hello in one word' }],
      max_tokens: 100,
    })
    console.log('✅ Gemini API key valid — model:', getModel(), 'response:', completion.choices[0]?.message?.content?.trim())
    return true
  } catch (err) {
    console.error('❌ Gemini failed:', err.message)
    return false
  }
}

async function main() {
  console.log('Checking Dream Wave backend credentials...\n')
  const mongoOk = await checkMongo()
  const geminiOk = await checkGemini()
  console.log('')
  if (mongoOk && geminiOk) {
    console.log('All checks passed. Start the server with: npm run dev')
    process.exit(0)
  }
  console.log('Fix server/.env and run this script again.')
  process.exit(1)
}

main()

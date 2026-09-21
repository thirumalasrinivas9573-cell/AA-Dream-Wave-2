/**
 * Verify MongoDB + OpenAI credentials before starting the server.
 * Usage: node scripts/verify-connection.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mongoose = require('mongoose')
const OpenAI = require('openai')

const mongoUrl = process.env.MONGODB_URL?.trim()
const openaiKey = process.env.OPENAI_API_KEY?.trim()

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

async function checkOpenAI() {
  if (!openaiKey) {
    console.error('❌ OPENAI_API_KEY is empty — add your ChatGPT API key to server/.env')
    return false
  }
  try {
    const client = new OpenAI({ apiKey: openaiKey })
    const models = await client.models.list()
    console.log('✅ OpenAI API key valid —', models.data.length, 'models available')
    return true
  } catch (err) {
    console.error('❌ OpenAI failed:', err.message)
    return false
  }
}

async function main() {
  console.log('Checking Dream Wave backend credentials...\n')
  const mongoOk = await checkMongo()
  const openaiOk = await checkOpenAI()
  console.log('')
  if (mongoOk && openaiOk) {
    console.log('All checks passed. Start the server with: npm run dev')
    process.exit(0)
  }
  console.log('Fix server/.env and run this script again.')
  process.exit(1)
}

main()

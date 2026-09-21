/**
 * MJ Memory DB utilities — uses existing mongoose connection, isolated collections only.
 * @module mj/memory/db/connection
 */

const { MJLogger } = require('../../logger')

const logger = MJLogger.child('Memory:DB')

function getMongoose() {
  try {
    return require('mongoose')
  } catch {
    return null
  }
}

/** @returns {boolean} */
function isDbReady() {
  const mongoose = getMongoose()
  return mongoose?.connection?.readyState === 1
}

/** @returns {import('mongoose').Connection|null} */
function getConnection() {
  const mongoose = getMongoose()
  if (!mongoose || !isDbReady()) return null
  return mongoose.connection
}

function requireDb() {
  if (!isDbReady()) {
    logger.warning('MongoDB not ready — memory operations will use in-memory fallback')
    return false
  }
  return true
}

module.exports = { getMongoose, isDbReady, getConnection, requireDb }

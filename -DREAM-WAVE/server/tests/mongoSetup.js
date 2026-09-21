/**
 * Use a workspace-local MongoDB binary cache so tests run in sandboxes/CI
 * without writing to ~/.cache.
 */
const fs = require('fs')
const path = require('path')

const cacheDir = path.resolve(__dirname, '../.cache/mongodb-binaries')
fs.mkdirSync(cacheDir, { recursive: true })
process.env.MONGOMS_DOWNLOAD_DIR = cacheDir

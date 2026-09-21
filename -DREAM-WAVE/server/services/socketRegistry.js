/** Global Socket.IO accessor — single server instance from server.js */

let ioInstance = null

function setSocketIo(io) {
  ioInstance = io
}

function getSocketIo() {
  return ioInstance
}

module.exports = { setSocketIo, getSocketIo }

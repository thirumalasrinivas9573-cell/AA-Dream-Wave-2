/**
 * @module mj/voice/interfaces
 */
const { ISTTProvider } = require('./ISTTProvider')
const { ITTSProvider } = require('./ITTSProvider')
const { INoiseFilter } = require('./INoiseFilter')
const { ISilenceDetector } = require('./ISilenceDetector')

module.exports = {
  ISTTProvider,
  ITTSProvider,
  INoiseFilter,
  ISilenceDetector,
}

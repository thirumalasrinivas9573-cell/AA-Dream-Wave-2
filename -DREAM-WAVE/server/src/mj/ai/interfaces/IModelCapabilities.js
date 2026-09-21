/**
 * Model Capability Interfaces (future implementations)
 * @module mj/ai/interfaces/IModelCapabilities
 */

const { MODEL_CAPABILITIES } = require('../constants')

/** @interface IChatCompletion */
const IChatCompletion = { method: 'chatCompletion' }

/** @interface IStructuredJSON */
const IStructuredJSON = { method: 'structuredJSON' }

/** @interface IEmbeddings */
const IEmbeddings = { method: 'embeddings' }

/** @interface IFunctionCalling */
const IFunctionCalling = { method: 'functionCalling' }

/** @interface IStreaming */
const IStreaming = { method: 'stream' }

/** @interface IImageUnderstanding */
const IImageUnderstanding = { method: 'analyzeImage' }

/** @interface IVideoGeneration */
const IVideoGeneration = { method: 'generateVideo' }

/** @interface ISpeechRecognition */
const ISpeechRecognition = { method: 'transcribe' }

/** @interface ISpeechSynthesis */
const ISpeechSynthesis = { method: 'synthesize' }

module.exports = {
  MODEL_CAPABILITIES,
  IChatCompletion,
  IStructuredJSON,
  IEmbeddings,
  IFunctionCalling,
  IStreaming,
  IImageUnderstanding,
  IVideoGeneration,
  ISpeechRecognition,
  ISpeechSynthesis,
}

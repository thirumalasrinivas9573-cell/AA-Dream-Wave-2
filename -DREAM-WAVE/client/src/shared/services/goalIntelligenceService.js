import { goalIntelligenceApi } from './api'
import { withRetry } from './retryService'

async function suggest(ambition, category = 'Career') {
  const response = await withRetry(() => goalIntelligenceApi.suggest({ ambition, category }), { retries: 1 })
  return response.data
}

async function clarify(ambition) {
  const response = await withRetry(() => goalIntelligenceApi.clarify({ ambition }), { retries: 1 })
  return response.data
}

async function saveFromSuggestion(suggestion) {
  const response = await withRetry(() => goalIntelligenceApi.save({ suggestion }), { retries: 1 })
  return response.data
}

async function weeklyReview() {
  const response = await withRetry(() => goalIntelligenceApi.weeklyReview(), { retries: 1 })
  return response.data
}

async function conflicts() {
  const response = await withRetry(() => goalIntelligenceApi.conflicts(), { retries: 1 })
  return response.data
}

async function progress(goalId) {
  const response = await withRetry(() => goalIntelligenceApi.progress(goalId), { retries: 1 })
  return response.data
}

async function nextAction(goalId) {
  const response = await withRetry(() => goalIntelligenceApi.nextAction(goalId), { retries: 1 })
  return response.data
}

async function review(goalId) {
  const response = await withRetry(() => goalIntelligenceApi.review(goalId), { retries: 1 })
  return response.data
}

async function adaptPreview(goalId) {
  const response = await withRetry(() => goalIntelligenceApi.adaptPreview(goalId), { retries: 1 })
  return response.data
}

async function applyAdaptation(goalId, suggested) {
  const response = await withRetry(() => goalIntelligenceApi.applyAdaptation(goalId, { suggested }), { retries: 1 })
  return response.data
}

async function suggestTasks(goalId, stageTitle = '') {
  const response = await withRetry(() => goalIntelligenceApi.suggestTasks(goalId, { stageTitle }), { retries: 1 })
  return response.data
}

async function acceptTasks(goalId, tasks) {
  const response = await withRetry(() => goalIntelligenceApi.acceptTasks(goalId, { tasks }), { retries: 1 })
  return response.data
}

export const goalIntelligenceService = {
  suggest,
  clarify,
  saveFromSuggestion,
  weeklyReview,
  conflicts,
  progress,
  nextAction,
  review,
  adaptPreview,
  applyAdaptation,
  suggestTasks,
  acceptTasks,
}

export default goalIntelligenceService

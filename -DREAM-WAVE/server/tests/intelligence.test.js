const test = require('node:test')
const assert = require('node:assert/strict')
const recommendationEngine = require('../services/recommendationEngine')

test('recommendation engine exposes all integration-ready providers', () => {
  const expected = ['books', 'skills', 'courses', 'goals', 'roadmaps', 'career', 'internships']
  assert.deepEqual(Object.keys(recommendationEngine.PROVIDERS).sort(), expected.sort())
})

test('intelligence routes are registered with student guard', () => {
  const router = require('../routes/intelligence')
  const homeRoute = router.stack.find((layer) => layer.route?.path === '/home')
  assert.ok(homeRoute)
  const handlers = homeRoute.route.stack.map((layer) => layer.handle?.name)
  assert.ok(handlers.includes('auth'))
})

test('intelligence service exports core aggregation methods', () => {
  const intelligenceService = require('../services/intelligenceService')
  assert.equal(typeof intelligenceService.getHome, 'function')
  assert.equal(typeof intelligenceService.getDashboardInsights, 'function')
  assert.equal(typeof intelligenceService.buildPersonalProfile, 'function')
})

test('unified search supports career and conversations types', () => {
  const searchController = require('../controllers/searchController')
  const source = searchController.unifiedSearch.toString()
  assert.match(source, /career/)
  assert.match(source, /conversations/)
})

test('user profile schema includes intelligence memory fields', () => {
  const UserProfile = require('../models/UserProfile')
  const paths = UserProfile.schema.paths
  assert.ok(paths.preferredTopics)
  assert.ok(paths['knowledgeMemory.bookmarks'])
  assert.ok(paths['careerPreferences.roles'])
})

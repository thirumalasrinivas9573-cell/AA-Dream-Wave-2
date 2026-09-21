const test = require('node:test')
const assert = require('node:assert/strict')
const { safeHttpUrl, cleanPromotionInput, escapeRegex } = require('../utils/portalHelpers')

test('safeHttpUrl rejects executable and protocol-relative URLs', () => {
  assert.equal(safeHttpUrl('javascript:alert(1)'), '')
  assert.equal(safeHttpUrl('data:text/html,test'), '')
  assert.equal(safeHttpUrl('//attacker.example/path', { allowRelative: true }), '')
  assert.equal(safeHttpUrl('/api/profile/assets/file.pdf', { allowRelative: true }), '/api/profile/assets/file.pdf')
})

test('safeHttpUrl enforces HTTPS in production', () => {
  const previous = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  try {
    assert.equal(safeHttpUrl('http://example.com/file.pdf'), '')
    assert.equal(safeHttpUrl('https://example.com/file.pdf'), 'https://example.com/file.pdf')
  } finally {
    process.env.NODE_ENV = previous
  }
})

test('promotion input strips ownership, moderation state, and dangerous links', () => {
  const payload = cleanPromotionInput({
    title: '  Release notice  ',
    content: 'Details',
    status: 'published',
    ownerId: 'attacker',
    link: 'javascript:alert(1)',
  })
  assert.deepEqual(payload, {
    title: 'Release notice',
    content: 'Details',
    category: 'news',
    image: '',
    link: '',
  })
})

test('escapeRegex neutralizes user-controlled regular expressions', () => {
  const escaped = escapeRegex('(a+)+$')
  assert.equal(new RegExp(escaped).test('(a+)+$'), true)
  assert.equal(new RegExp(escaped).test('aaaaaaaa'), false)
})

test('admin stats route is registered after the admin guard', () => {
  const router = require('../routes/admin')
  const guardIndex = router.stack.findIndex((layer) => !layer.route && layer.handle?.name === 'auth')
  const statsIndex = router.stack.findIndex((layer) => layer.route?.path === '/stats')
  assert.ok(guardIndex >= 0)
  assert.ok(statsIndex > guardIndex)
})

test('library PDF route is registered after authentication middleware', () => {
  const router = require('../routes/library')
  const authIndex = router.stack.findIndex((layer) => !layer.route && layer.handle?.name === 'auth')
  const pdfIndex = router.stack.findIndex((layer) => layer.route?.path === '/books/:id/pdf')
  assert.ok(authIndex >= 0)
  assert.ok(pdfIndex > authIndex)
})

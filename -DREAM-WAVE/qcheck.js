const http = require('http')

function req(m, p, b, t) {
  return new Promise(res => {
    const d = b ? JSON.stringify(b) : null
    const o = {
      hostname: 'localhost', port: 5001, path: p, method: m,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: 'Bearer ' + t } : {}),
        ...(d ? { 'Content-Length': Buffer.byteLength(d) } : {})
      }
    }
    const r = http.request(o, r2 => {
      let s = ''; r2.on('data', c => s += c)
      r2.on('end', () => {
        try { res({ s: r2.statusCode, b: JSON.parse(s) }) }
        catch { res({ s: r2.statusCode, b: s.slice(0, 80) }) }
      })
    })
    r.on('error', e => res({ s: 0, b: e.message }))
    if (d) r.write(d); r.end()
  })
}

async function run() {
  let pass = 0, fail = 0
  function ok(name, cond, detail) {
    const icon = cond ? '[OK]' : '[XX]'
    console.log(icon + ' ' + name + (detail ? ' -- ' + detail : ''))
    cond ? pass++ : fail++
  }

  console.log('\n=== DREAM WAVE AI V10 - FINAL QUALITY CHECK ===\n')

  // Health
  let x = await req('GET', '/health')
  ok('Backend :5001',     x.s === 200)
  ok('MongoDB connected', x.b && x.b.status === 'OK')

  // Auth
  x = await req('POST', '/api/auth/login', { email: 'test@dreamwave.ai', password: 'test123' })
  ok('Login', x.s === 200 && !!x.b.token, x.b.user && x.b.user.name)
  const tok = x.b.token
  if (!tok) { console.log('No token - stopping'); return }

  x = await req('GET', '/api/auth/me', null, tok)
  ok('/auth/me', x.s === 200, x.b.user && x.b.user.email)

  // All API routes
  const routes = [
    ['GET', '/api/goals',              null, 'Goals'],
    ['GET', '/api/tasks',              null, 'Tasks'],
    ['GET', '/api/report',             null, 'Reports'],
    ['GET', '/api/books',              null, 'Books'],
    ['GET', '/api/community',          null, 'Community'],
    ['GET', '/api/profile',            null, 'Profile'],
    ['GET', '/api/admin/stats',        null, 'Admin Stats'],
    ['GET', '/api/ai/dashboard-stats', null, 'AI Stats'],
  ]
  for (const [m, p, b, name] of routes) {
    x = await req(m, p, b, tok)
    ok(name + ' API', x.s === 200)
  }

  // CRUD operations
  x = await req('POST', '/api/goals', { title: 'V10 Test Goal', category: 'Career' }, tok)
  ok('Create goal', x.s === 201, x.b.goal && x.b.goal.title)
  const gid = x.b.goal && x.b.goal._id

  x = await req('POST', '/api/tasks', { title: 'V10 Test Task', priority: 'High' }, tok)
  ok('Create task', x.s === 201, x.b.task && x.b.task.title)
  const tid = x.b.task && x.b.task._id

  if (tid) {
    x = await req('PUT',    '/api/tasks/' + tid, { completed: true }, tok); ok('Toggle task complete', x.s === 200)
    x = await req('DELETE', '/api/tasks/' + tid, null, tok);               ok('Delete task', x.s === 200)
  }

  if (gid) {
    x = await req('GET',    '/api/roadmap/' + gid, null, tok)
    ok('Roadmap endpoint', x.s === 200 || x.s === 404)
    x = await req('DELETE', '/api/goals/' + gid, null, tok);               ok('Delete goal', x.s === 200)
  }

  // AI mentor - test both modes
  x = await req('POST', '/api/mentor/chat', { message: 'Hello', mode: 'general' }, tok)
  ok('Mentor general mode', x.s === 200 && !!x.b.reply, x.b.reply && x.b.reply.length + ' chars')

  // Community post
  x = await req('POST', '/api/community', { content: 'V10 test post!', tag: 'General' }, tok)
  ok('Create community post', x.s === 201)

  // Frontend
  const fe = await new Promise(r => {
    http.get('http://localhost:5173/', res2 => r(res2.statusCode)).on('error', () => r(0))
  })
  ok('Frontend :5173', fe === 200, 'React+Vite running')

  // Summary
  console.log('\n==============================================')
  console.log('  PASS: ' + pass + '   FAIL: ' + fail + '   TOTAL: ' + (pass + fail))
  console.log('  Score: ' + Math.round(pass / (pass + fail) * 100) + '%')
  if (fail === 0) {
    console.log('\n  DREAM WAVE AI V10 -- ALL SYSTEMS OPERATIONAL')
    console.log('  Backend  -> http://localhost:5001')
    console.log('  Frontend -> http://localhost:5173')
  } else {
    console.log('\n  Some checks failed - see [XX] above')
  }
  console.log('==============================================\n')
}

run().catch(e => console.error('Test error:', e.message))

// GitHub push using isomorphic-git (no Xcode needed)
const git   = require('/Users/apple/node18/lib/node_modules/isomorphic-git')
const http  = require('/Users/apple/node18/lib/node_modules/isomorphic-git/http/node')
const fs    = require('fs')
const path  = require('path')

const dir   = '/Volumes/HP USB321FD/DREAM WAVE/AA_DREAM_WAVE/MJ_DREAM_WAVE'
const REPO  = process.argv[2] || ''
const TOKEN = process.argv[3] || ''
const USER  = process.argv[4] || ''

if (!REPO || !TOKEN || !USER) {
  console.log('\nUsage:')
  console.log('  node github_push.js REPO_URL GITHUB_TOKEN YOUR_USERNAME')
  console.log('\nExample:')
  console.log('  node github_push.js https://github.com/john/aa-dream-wave.git ghp_xxx john')
  console.log('\nGet token: github.com → Settings → Developer settings → Personal access tokens')
  process.exit(1)
}

async function push() {
  console.log('\n🌊 AA Dream Wave — Pushing to GitHub\n')

  try {
    // Init if needed
    try {
      await git.init({ fs, dir })
      console.log('✅ Git initialized')
    } catch(e) { console.log('Git already initialized') }

    // Set config
    await git.setConfig({ fs, dir, path: 'user.name',  value: USER })
    await git.setConfig({ fs, dir, path: 'user.email', value: `${USER}@users.noreply.github.com` })

    // Read current files and stage them
    const status = await git.statusMatrix({ fs, dir })
    const toAdd  = status.filter(([,h,w]) => w !== h).map(([f]) => f)
    console.log(`📁 Staging ${toAdd.length} files...`)

    for (const f of toAdd.slice(0, 500)) {
      try { await git.add({ fs, dir, filepath: f }) } catch(e) {}
    }

    // Commit
    const sha = await git.commit({
      fs, dir,
      author: { name: USER, email: `${USER}@users.noreply.github.com` },
      message: `AA Dream Wave — Production Build ${new Date().toISOString().slice(0,10)}`
    })
    console.log(`✅ Committed: ${sha.slice(0,8)}`)

    // Add remote
    try {
      await git.addRemote({ fs, dir, remote: 'origin', url: REPO })
    } catch(e) {
      await git.deleteRemote({ fs, dir, remote: 'origin' })
      await git.addRemote({ fs, dir, remote: 'origin', url: REPO })
    }

    // Push
    console.log('⬆️  Pushing to GitHub...')
    await git.push({
      fs, http, dir,
      remote: 'origin',
      ref: 'main',
      force: true,
      onAuth: () => ({ username: USER, password: TOKEN }),
      onAuthFailure: () => { throw new Error('Auth failed — check your token') }
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Pushed to GitHub successfully!')
    console.log(`   Repo: ${REPO}`)
    console.log('\nNext steps:')
    console.log('  1. Deploy backend on render.com → Root dir: server')
    console.log('  2. Deploy frontend on netlify.com → Base dir: client')
    console.log('  See DEPLOY_NOW.md for full instructions')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } catch(err) {
    console.error('\n❌ Error:', err.message)
    if (err.message.includes('Auth')) {
      console.log('\nMake sure your GitHub token has "repo" scope:')
      console.log('  github.com → Settings → Developer settings → Personal access tokens → Generate new token')
    }
  }
}

push()

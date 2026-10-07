import esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(__dirname, '../..')
const ROOT_DIR = path.resolve(CLIENT_DIR, '..')

const entryFile = path.resolve(__dirname, 'task-runner.jsx')
const bundleFile = path.resolve(__dirname, 'task-runner-bundle.mjs')

try {
  esbuild.buildSync({
    entryPoints: [entryFile],
    bundle: true,
    outfile: bundleFile,
    platform: 'node',
    format: 'esm',
    loader: { '.js': 'jsx', '.jsx': 'jsx' },
    alias: {
      '@shared': path.resolve(CLIENT_DIR, 'src/shared'),
    },
    external: ['react', '@react-pdf/renderer', 'pdfjs-dist', 'fontkit', 'fs', 'path', 'url'],
  })
} catch (err) {
  console.error('ESBUILD_TASK_RUNNER_FAILED:', err.message)
  process.exit(1)
}

const nodePath = path.resolve(ROOT_DIR, '.tools/node-v20.18.0-win-x64/node.exe')

const res = spawnSync(nodePath, [bundleFile], {
  cwd: __dirname,
  encoding: 'utf8',
  maxBuffer: 50 * 1024 * 1024,
})

if (res.error) {
  console.error('SPAWN_ERROR:', res.error)
  process.exit(1)
}

if (res.stdout) console.log(res.stdout)
if (res.stderr) console.error(res.stderr)

process.exit(res.status || 0)

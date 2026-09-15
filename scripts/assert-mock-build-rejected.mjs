import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const result = spawnSync(process.execPath, [vite, 'build', '--mode', 'mock'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  encoding: 'utf8',
})

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
if (result.status === 0 || !output.includes('local mocks are serve-only')) {
  console.error(output || 'Mock build unexpectedly succeeded')
  process.exit(1)
}

console.log('Mock deploy build is rejected as expected.')

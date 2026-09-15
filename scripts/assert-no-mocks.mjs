import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const distPath = fileURLToPath(new URL('../dist/', import.meta.url))
const forbidden = [
  'ADCALLTRACK_LOCAL_MOCK_ONLY_7F3C9A',
  'administrator@local.mock',
  'LOCAL MOCK Account',
  'local-mock-access-token',
  'local-mock-refresh-token',
]

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? files(path) : [path]
    }),
  )
  return nested.flat()
}

const violations = []
for (const file of await files(distPath)) {
  const text = (await readFile(file)).toString('utf8')
  const matched = forbidden.filter((value) => text.includes(value))
  if (matched.length > 0 || /dev-mocks|localMockPlugin/.test(text)) {
    violations.push(`${relative(distPath, file)}: ${matched.join(', ') || 'mock module reference'}`)
  }
}

if (violations.length > 0) {
  console.error(`Mock content found in deployable build:\n${violations.join('\n')}`)
  process.exit(1)
}

console.log('No local mock fixtures or credentials found in dist.')

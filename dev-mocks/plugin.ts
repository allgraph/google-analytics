import type { Plugin } from 'vite'
import { createMockMiddleware, mockCredentials } from './server.js'
import type { MockScenario } from './data.js'

const scenarios = new Set<MockScenario>([
  'full',
  'empty',
  'oauth-expired',
  'sync-error',
  'rate-limit',
  'server-error',
])

export function localMockPlugin(rawScenario: string | undefined): Plugin {
  const scenario = scenarios.has(rawScenario as MockScenario)
    ? (rawScenario as MockScenario)
    : 'full'
  return {
    name: 'adcalltrack-local-mock',
    apply: 'serve',
    configResolved(config) {
      const host = String(config.server.host ?? 'localhost')
      if (!['127.0.0.1', 'localhost', '::1'].includes(host))
        throw new Error('Local mocks may only bind to a loopback host')
    },
    configureServer(server) {
      const credentials = mockCredentials()
      console.info(
        `[local-mock] scenario=${scenario} email=${credentials.email} password=${credentials.password}`,
      )
      server.middlewares.use(createMockMiddleware(scenario))
    },
  }
}

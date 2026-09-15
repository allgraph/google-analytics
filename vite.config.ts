/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { localMockPlugin } from './dev-mocks/plugin.js'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiMode = env.VITE_API_MODE

  if (command === 'build' && apiMode !== 'real') {
    throw new Error('Deployable builds require VITE_API_MODE=real; local mocks are serve-only')
  }
  if (command === 'serve' && apiMode === 'mock' && mode !== 'mock') {
    throw new Error('VITE_API_MODE=mock is only allowed with the dedicated Vite mock mode')
  }

  return {
    plugins: [react(), ...(apiMode === 'mock' ? [localMockPlugin(env.MOCK_SCENARIO)] : [])],
    server: {
      host: '127.0.0.1',
      open: 'http://127.0.0.1:5173',
      proxy:
        apiMode === 'real'
          ? {
              '/api/v1': {
                target: env.DEV_API_PROXY_TARGET || 'https://dev.adcalltrack.de',
                changeOrigin: true,
                secure: true,
              },
            }
          : undefined,
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'dev-mocks/**/*.test.ts'],
    },
  }
})

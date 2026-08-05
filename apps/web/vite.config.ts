import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv, type Plugin, type ServerOptions } from 'vite'



export function backendProxy(simulatorOnly: boolean): NonNullable<ServerOptions['proxy']> {
  if (simulatorOnly) return {}
  return {
    '/api': 'http://localhost:3001',
    '/socket.io': {
      target: 'http://localhost:3001',
      ws: true,
    },
  }
}

function simulatorBuildMarker(enabled: boolean): Plugin {
  return {
    name: 'lgu-simulator-build-marker',
    apply: 'build',
    async closeBundle() {
      const outputDirectory = resolve(process.cwd(), 'dist')
      await mkdir(outputDirectory, { recursive: true })
      await writeFile(
        resolve(outputDirectory, '.simulator-enabled'),
        String(enabled),
        'utf8',
      )
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const simulatorOnly = mode === 'simulator'
  const simulatorEnabled = (
    simulatorOnly
    ||
    command === 'serve'
    || environment.VITE_ENABLE_SIMULATOR === 'true'
  )

  return {
    base: process.env.VITE_BASE_PATH ?? '/',
    publicDir: 'public',
    define: {
      __SIMULATOR_ENABLED__: JSON.stringify(simulatorEnabled),
      __SIMULATOR_ONLY__: JSON.stringify(simulatorOnly),
    },
    plugins: [
      vue(),
      tailwindcss(),
      simulatorBuildMarker(simulatorEnabled),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: backendProxy(simulatorOnly),
    },
  }
})

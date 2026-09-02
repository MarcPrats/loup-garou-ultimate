import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type ServerOptions } from 'vite'

export function backendProxy(): NonNullable<ServerOptions['proxy']> {
  return {
    '/api': 'http://localhost:3001',
    '/socket.io': {
      target: 'http://localhost:3001',
      ws: true,
    },
  }
}

export default defineConfig(() => ({
  base: process.env.VITE_BASE_PATH ?? '/',
  publicDir: 'public',
  plugins: [vue(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: backendProxy(),
    allowedHosts: ["pluteal-beatrice-dorsal.ngrok-free.dev"]
  },
}))

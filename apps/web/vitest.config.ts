import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: { __SIMULATOR_ENABLED__: true, __SIMULATOR_ONLY__: false },
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    restoreMocks: true,
  },
})

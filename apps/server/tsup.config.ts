import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  bundle: true,
  noExternal: ['@lgu/contracts', '@lgu/game-core', '@lgu/game-projection'],
})

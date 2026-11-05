import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      { test: { name: 'game', root: './game', environment: 'node' } },
      { test: { name: 'bot', root: './bot', environment: 'node' } },
      { extends: './web/vite.config.js', test: { name: 'web', root: './web', environment: 'jsdom' } },
    ],
    coverage: {
      provider: 'v8',
      include: ['game/src/**', 'bot/src/**', 'web/src/**'],
      exclude: ['web/src/main.jsx'],
      reporter: ['text', 'html'],
    },
  },
})

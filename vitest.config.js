import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      { test: { name: 'game', root: './game', environment: 'node' } },
      { test: { name: 'bot', root: './bot', environment: 'node' } },
    ],
    coverage: {
      provider: 'v8',
      include: ['game/src/**', 'bot/src/**', 'web/src/**'],
      reporter: ['text', 'html'],
    },
  },
})

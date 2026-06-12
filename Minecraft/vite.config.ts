import { defineConfig as defineViteConfig } from 'vite'
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config'

export default mergeConfig(
  defineViteConfig({}),
  defineVitestConfig({
    test: {
      environment: 'node',
      globals: true,
    },
  }),
)

import { defineConfig as defineViteConfig } from 'vite'
import { defineConfig as defineVitestConfig, mergeConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default mergeConfig(
  defineViteConfig({
    plugins: [react()],
  }),
  defineVitestConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test-setup.ts',
    },
  }),
)

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const reactPlugin = react() as any

export default defineConfig({
  plugins: [reactPlugin],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    // React's production build does not export `act`, so Testing Library
    // cannot render anything under NODE_ENV=production. Pinning the mode
    // here keeps the suite runnable whatever the ambient environment is.
    env: {
      NODE_ENV: 'development',
    },
  },
})

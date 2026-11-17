import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev: '/', Pages-build: '/kavel-veiling-test/'
const repoBase = process.env.VITE_BASE || '/'

export default defineConfig({
  plugins: [react()],
  base: repoBase,
})

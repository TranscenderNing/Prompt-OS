import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 本地开发: http://127.0.0.1:8000
// docker-compose.dev: http://backend:8000（通过 VITE_API_BASE 注入）
const API_TARGET = process.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': API_TARGET,
    },
  },
})

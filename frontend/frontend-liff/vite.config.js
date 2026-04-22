import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    allowedHosts: [
      '.ngrok-free.app', 
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // มั่นใจว่าหลังบ้านรันที่ 5000
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
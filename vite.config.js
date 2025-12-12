import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/sauntercast-antigrav/',
  plugins: [react()],
  server: {
    allowedHosts: ['happy-seas-call.loca.lt']
  }
})

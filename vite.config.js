import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: 'https://aufer.site',
      dynamicRoutes: ['/gamer-site', '/privacy', '/terms'],
      exclude: ['/login', '/login/admin', '/dashboard'],
    }),
  ],
  server: {
    open: true,
    host: true
  }
})
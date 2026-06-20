import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// PWA plugin temporarily disabled – workbox-build crashes on Windows
// with the installed vite-plugin-pwa@1.x. The manifest is served
// statically from public/manifest.webmanifest instead.

export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    rollupOptions: {
      external: ['firebase-admin']
    }
  },
  server: {
    port: 4173
  }
});


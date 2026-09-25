import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev only: forward /backend/* to a local PHP API so the app runs end to end
// with `npm run dev`, e.g.
//   php -S 127.0.0.1:8000 -t backend backend/index.php
// Override the target with API_PROXY_TARGET. Production builds are unaffected
// (the API is served from /backend next to the built files).
const apiTarget = process.env.API_PROXY_TARGET || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/'
    }
  },
  server: {
    proxy: {
      '/backend': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
    },
  },
});

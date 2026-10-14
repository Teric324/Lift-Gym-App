import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt": a new version is downloaded and then waits; it never swaps in by itself.
      registerType: 'prompt',
      injectRegister: false, // registered from src/features/pwa/update.ts
      includeAssets: ['apple-touch-icon.png', 'favicon-32x32.png'],
      manifest: {
        name: 'Lift',
        short_name: 'Lift',
        description: 'A fast workout tracker',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#16181d',
        background_color: '#16181d',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Everything the app needs is precached, so it opens and works fully offline.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
        // Deep links and reloads (/settings) are answered with the app shell, also offline.
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    /*
     * Installable, and openable without a network (docs/05-frontend/pwa.md).
     *
     * `prompt` rather than `autoUpdate`: this app is often open on a clock —
     * a timed test, a mock paper, a live duel — and swapping the running
     * build underneath someone mid-question is exactly the failure
     * `src/lib/stale-build.ts` exists to recover from. The new version waits
     * and announces itself instead (`src/app/providers/NewVersionPrompt.tsx`).
     */
    VitePWA({
      registerType: 'prompt',
      // A cached shell must not be able to serve a page whose files are gone.
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'L&S — підготовка до НМТ',
        short_name: 'L&S',
        description: 'Тести, пробні НМТ, робота над помилками й дуелі — з поясненням до кожної відповіді.',
        lang: 'uk',
        // The product, not the poster: whoever installed this already knows
        // what the landing page had to say.
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // The splash screen and the task switcher, before any CSS has run.
        // Dark because dark is the default theme; the light theme repaints
        // the address bar at runtime through the theme-color meta tag.
        theme_color: '#0b0a0f',
        background_color: '#0b0a0f',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          // Android crops an icon to its own shape — circle, squircle,
          // rounded square. Without this one it would crop the plain icon and
          // cut the mark's corners off.
          {
            src: '/pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // The shell only. Question images and the two heaviest lazy chunks are
        // fetched when something actually needs them (see runtimeCaching), so
        // a first visit does not pay for a maths formula renderer it may never
        // open.
        globPatterns: ['**/*.{js,css,html,woff2}'],
        globIgnores: ['**/katex.min-*.js', '**/MarkdownContent-*.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            /*
             * The API, never cached — and this is a privacy rule, not a
             * performance one. A cached answer sheet or a page of statistics
             * outlives the session that fetched it and would be readable by
             * whoever picks up the phone next. The session is deliberately
             * long now (decision 36), which makes this stricter, not looser.
             */
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            // Question images: fixed content at stable paths, worth keeping.
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/content/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'quix-content',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // The heavy chunks left out of the precache above.
            urlPattern: /\/assets\/(katex\.min|MarkdownContent)-[\w-]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quix-heavy-chunks',
              expiration: { maxEntries: 8 },
            },
          },
        ],
      },
      devOptions: {
        // Off in `npm run dev`: a service worker serving a cached build is the
        // last thing wanted while editing. Verified with `build` + `preview`.
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Component tests run against jsdom with the same aliases as the app, so a
  // test imports «@/...» exactly as the source does.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },

  server: {
    port: 5173,
    // Optional local-dev proxy (Phase 6.1 decision F13): same-origin `/api`
    // calls avoid CORS in development. Production uses VITE_API_URL directly.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});

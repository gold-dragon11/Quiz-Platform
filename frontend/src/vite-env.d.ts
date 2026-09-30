/// <reference types="vite/client" />
/* `virtual:pwa-register/react`, the hook that reports a waiting service worker. */
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Empty or absent everywhere except production — see lib/sentry.ts. */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

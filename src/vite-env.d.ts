/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_DATABASE_URL: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_PAIR_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface LanaDesktopApi {
  isDesktop: true
  notifyMessage: (title: string, body: string) => void
  statusChanged: (label: string) => void
  getPlatform: () => Promise<string>
  openExternal: (url: string) => void
}

interface Window {
  lanaDesktop?: LanaDesktopApi
}

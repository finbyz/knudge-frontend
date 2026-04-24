/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_PATH?: string;
  /** Full WebSocket URL for notifications (optional; defaults from API host). */
  readonly VITE_WS_NOTIFICATIONS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

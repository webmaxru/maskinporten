/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Application Insights connection string, injected at build time. */
  readonly VITE_APPINSIGHTS_CONNECTION_STRING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

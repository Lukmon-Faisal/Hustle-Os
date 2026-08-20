/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Hustle OS FastAPI backend, e.g. https://hustle-os-p6jt.onrender.com */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

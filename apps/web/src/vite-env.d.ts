/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SKIP_AUTH: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

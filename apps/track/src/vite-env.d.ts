/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OBD_BRIDGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

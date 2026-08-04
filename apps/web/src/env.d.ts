/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_SIMULATOR?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __SIMULATOR_ENABLED__: boolean
declare const __SIMULATOR_ONLY__: boolean

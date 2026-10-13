/// <reference types="vite/client" />

// Fallback typing for `.vue` imports in plain TS tooling (ESLint's TS program).
// vue-tsc resolves real component types and takes precedence over this.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}

interface ImportMetaEnv {
  /** Overrides the API base URL (defaults to the same-origin `/api/v1`). */
  readonly VITE_API_BASE_URL?: string;
}

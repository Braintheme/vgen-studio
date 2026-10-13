/** Base URL of the vgen API; the dev server proxies it, production serves it on the same origin. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

/** Requests that may run long (uploads) get their own timeout; everything else uses this one. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Uploads of large photos/tracks may take a while on slow links. */
export const UPLOAD_TIMEOUT_MS = 10 * 60_000;

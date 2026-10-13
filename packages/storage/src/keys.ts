/** Canonical storage key layout; keep all key construction here. */
export const storageKeys = {
  upload: (assetId: string, extension: string, date: Date): string =>
    `uploads/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${assetId}.${extension}`,
  derivative: (assetId: string, name: string): string => `derivatives/${assetId}/${name}`,
  renderOutput: (jobId: string, fileName: string): string => `renders/${jobId}/${fileName}`,
  renderThumbnail: (jobId: string): string => `renders/${jobId}/thumbnail.jpg`,
  /** Cached preview frames, named by the hash of what they show. */
  preview: (hash: string): string => `previews/${hash}.jpg`,
};

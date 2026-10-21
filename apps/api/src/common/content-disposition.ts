/** `Content-Disposition` with an ASCII fallback name and the UTF-8 one (RFC 6266). */
export const contentDisposition = (type: 'inline' | 'attachment', fileName: string): string =>
  `${type}; filename="${fileName.replace(/[^\x20-\x7e]|["\\]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;

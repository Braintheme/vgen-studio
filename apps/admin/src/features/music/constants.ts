import { UPLOAD_MIME_TYPES } from '@vgen/shared';

export const MUSIC_ACCEPT = UPLOAD_MIME_TYPES.audio.join(',');

/** Track title suggested from a file name ("summer-vibes.mp3" -> "summer-vibes"). */
export const titleFromFileName = (fileName: string): string => fileName.replace(/\.[^.]+$/, '');

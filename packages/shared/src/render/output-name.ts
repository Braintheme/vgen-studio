import type { Format } from '../formats.js';

const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * `{templateId}_{presetName}_{format}_{date}.mp4`, safe for every file system. Image outputs
 * are a `.zip` of the slides (`slideFileName`).
 */
export const buildOutputFileName = (input: {
  readonly templateId: string;
  readonly presetName: string | null;
  readonly format: Format;
  readonly date: Date;
  readonly extension?: 'mp4' | 'zip';
}): string => {
  const preset = (input.presetName && slugify(input.presetName)) || 'custom';
  const format = input.format.replace(':', 'x');
  return `${input.templateId}_${preset}_${format}_${isoDate(input.date)}.${input.extension ?? 'mp4'}`;
};

/** `name_03.jpg` for slide 3 (1-based) of an image output named `name.zip`. */
export const slideFileName = (outputName: string, index: number, count: number): string => {
  const digits = Math.max(2, String(count).length);
  return `${outputName.replace(/\.[a-z0-9]+$/i, '')}_${String(index + 1).padStart(digits, '0')}.jpg`;
};

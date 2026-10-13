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

/** `{templateId}_{presetName}_{format}_{date}.mp4`, safe for every file system. */
export const buildOutputFileName = (input: {
  readonly templateId: string;
  readonly presetName: string | null;
  readonly format: Format;
  readonly date: Date;
}): string => {
  const preset = (input.presetName && slugify(input.presetName)) || 'custom';
  const format = input.format.replace(':', 'x');
  return `${input.templateId}_${preset}_${format}_${isoDate(input.date)}.mp4`;
};

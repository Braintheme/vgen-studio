/** A file name without its extension (`IMG_2700-2.jpg` -> `IMG_2700-2`). */
export const fileStem = (name: string): string => name.replace(/\.[^./\\]+$/, '');

/**
 * Natural order of file names by their stem: numbers compare by value and a name sorts before
 * its suffixed copies, so a Lightroom export `IMG_2700.jpg` comes right before `IMG_2700-2.jpg`.
 */
export const compareFileNames = (a: string, b: string): number =>
  fileStem(a).localeCompare(fileStem(b), 'en', { numeric: true, sensitivity: 'base' });

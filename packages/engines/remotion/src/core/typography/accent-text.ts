// Pure parsing of title text with inline accents: `Look in *Lightroom*`.

export interface TextRun {
  readonly text: string;
  readonly accent: boolean;
}

/** Splits text into plain and `*accented*` runs; an unmatched `*` is kept as text. */
export const parseAccentText = (text: string): readonly TextRun[] => {
  const runs: TextRun[] = [];
  const pattern = /\*([^*]+)\*/g;
  let last = 0;
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), accent: false });
    runs.push({ text: match[1] ?? '', accent: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), accent: false });
  return runs;
};

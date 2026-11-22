// What saving a render means: its file (a video, or the ZIP of an image render) and the bulk
// selection's bookkeeping. Pure; no Vue.
import type { RenderJobDto } from '@vgen/shared';

export interface RenderFile {
  readonly url: string;
  readonly name: string;
  readonly bytes: number;
}

/** The file saved for a render, or null while it has none (not done, failed, files gone). */
export const renderFile = (render: RenderJobDto): RenderFile | null => {
  if (render.status !== 'done') return null;
  if (render.output) {
    return { url: render.output.downloadUrl, name: render.outputName, bytes: render.output.size };
  }
  if (render.stills) {
    const bytes = render.stills.slides.reduce((sum, slide) => sum + slide.size, 0);
    return { url: render.stills.archiveUrl, name: render.outputName, bytes };
  }
  return null;
};

export const isSavable = (render: RenderJobDto): boolean => renderFile(render) !== null;

export const totalBytes = (renders: Iterable<RenderJobDto>): number => {
  let bytes = 0;
  for (const render of renders) bytes += renderFile(render)?.bytes ?? 0;
  return bytes;
};

/** A checkbox over a group: all, some or none of its `total` items selected. */
export type CheckState = boolean | 'indeterminate';

export const checkState = (selected: number, total: number): CheckState =>
  total > 0 && selected >= total ? true : selected > 0 ? 'indeterminate' : false;

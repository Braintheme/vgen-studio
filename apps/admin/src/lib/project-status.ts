// What a project's status line says (projects table, project editor). Pure; no Vue.
import type { ProjectDto } from '@vgen/shared';
import { dayKey, dayLabel, formatTime } from './days';

export type ProjectStatusTone = 'idle' | 'active' | 'done' | 'failed';

export interface ProjectStatusView {
  readonly tone: ProjectStatusTone;
  /** "Not rendered", "Rendering 40%", "Rendered 14:05", "Rendered Fri, 21 Nov"… */
  readonly label: string;
  /** Content changed after the last render started: rendering again would differ. */
  readonly editedSinceRender: boolean;
  /** The last render (to link to it), if any. */
  readonly renderId: string | null;
}

/** "14:05" today, else the day ("Fri, 21 Nov"). */
const when = (iso: string, timeZone: string, now: Date): string => {
  const key = dayKey(iso, timeZone);
  const today = dayKey(now, timeZone);
  return key === today ? formatTime(iso) : dayLabel(key, today).date;
};

export const projectStatus = (
  project: Pick<ProjectDto, 'lastRender' | 'updatedAt'>,
  timeZone: string,
  now: Date = new Date(),
): ProjectStatusView => {
  const render = project.lastRender;
  if (!render) return { tone: 'idle', label: 'Not rendered', editedSinceRender: false, renderId: null };
  const editedSinceRender = Date.parse(project.updatedAt) > Date.parse(render.createdAt);
  const base = { editedSinceRender, renderId: render.id };
  switch (render.status) {
    case 'queued':
      return { ...base, tone: 'active', label: 'Queued' };
    case 'rendering':
      return { ...base, tone: 'active', label: `Rendering ${String(render.progress)}%` };
    case 'done':
      return {
        ...base,
        tone: 'done',
        label: `Rendered ${when(render.finishedAt ?? render.createdAt, timeZone, now)}`,
      };
    case 'failed':
      return { ...base, tone: 'failed', label: 'Render failed' };
    case 'cancelled':
      return { ...base, tone: 'idle', label: 'Render cancelled' };
  }
};

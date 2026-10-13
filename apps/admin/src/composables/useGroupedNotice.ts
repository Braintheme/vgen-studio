import { onScopeDispose } from 'vue';
import { useNotify } from './useNotify';

/** Lines reported within this window end up in the same toast. */
const GROUP_WINDOW_MS = 6000;

let nextGroupId = 0;

/**
 * One info toast that collects several reasons (e.g. everything fixed in a stored draft,
 * reported by different parts of a screen at different times) instead of a toast each.
 */
export const useGroupedNotice = (title: string): ((line: string) => void) => {
  const notify = useNotify();
  const id = `notice-group-${String((nextGroupId += 1))}`;
  const lines: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  onScopeDispose(() => {
    clearTimeout(timer);
  });

  return (line) => {
    if (!lines.includes(line)) lines.push(line);
    notify.info(title, lines.join(' '), { id });
    clearTimeout(timer);
    timer = setTimeout(() => {
      lines.length = 0;
    }, GROUP_WINDOW_MS);
  };
};

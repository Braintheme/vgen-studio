import type { RenderJobDto } from '@vgen/shared';
import { computed, readonly, ref, type ComputedRef, type Ref } from 'vue';
import { useNotify } from '@/composables/useNotify';
import { renderFile } from '@/lib/render-files';
import {
  canPickFolder,
  folderNames,
  pickFolder,
  saveUrlToFolder,
  triggerDownload,
  uniqueFileName,
} from '@/lib/save-files';
import { useMarkDownloadedMutation } from '@/queries/renders';
import type { RenderSelection } from './useRenderSelection';

/** Pause between plain downloads, so the browser does not drop any of them. */
const DOWNLOAD_GAP_MS = 400;

export interface SaveProgress {
  readonly done: number;
  readonly total: number;
  /** File being saved now. */
  readonly current: string | null;
}

export interface RenderSave {
  /** Saves straight into a picked folder (else: plain downloads one by one). */
  readonly toFolder: boolean;
  readonly saving: ComputedRef<boolean>;
  readonly progress: Readonly<Ref<SaveProgress | null>>;
  /** Saves the selected renders; saved ones leave the selection, failed ones stay. */
  readonly saveSelected: () => Promise<void>;
  readonly stop: () => void;
  /** A single download from the row menu: only remembers it. */
  readonly markDownloaded: (render: RenderJobDto) => void;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Saving many renders at once, with progress, stop, and the "downloaded" mark per file. */
export const useRenderSave = (selection: RenderSelection): RenderSave => {
  const notify = useNotify();
  const mark = useMarkDownloadedMutation();
  const progress = ref<SaveProgress | null>(null);
  let controller: AbortController | null = null;
  const toFolder = canPickFolder();

  const remember = (ids: readonly string[]): void => {
    if (ids.length === 0) return;
    mark.mutate(ids, {
      onError: (error) => {
        notify.error('Saved, but could not mark as downloaded', error);
      },
    });
  };

  const intoFolder = async (
    folder: FileSystemDirectoryHandle,
    renders: readonly RenderJobDto[],
    signal: AbortSignal,
  ): Promise<{ saved: string[]; failed: number }> => {
    // A function, not `signal.aborted` inline: Stop flips it while a file is being awaited.
    const stopped = (): boolean => signal.aborted;
    const taken = await folderNames(folder);
    const saved: string[] = [];
    let failed = 0;
    for (const [index, render] of renders.entries()) {
      const file = renderFile(render);
      if (signal.aborted) break;
      if (!file) {
        failed += 1;
        continue;
      }
      const name = uniqueFileName(file.name, taken);
      taken.add(name.toLowerCase());
      progress.value = { done: index, total: renders.length, current: name };
      try {
        await saveUrlToFolder(folder, file.url, name, signal);
        saved.push(render.id);
        remember([render.id]);
      } catch {
        if (stopped()) break;
        failed += 1;
      }
    }
    return { saved, failed };
  };

  const asDownloads = async (
    renders: readonly RenderJobDto[],
    signal: AbortSignal,
  ): Promise<{ saved: string[]; failed: number }> => {
    const saved: string[] = [];
    for (const [index, render] of renders.entries()) {
      const file = renderFile(render);
      if (signal.aborted) break;
      if (!file) continue;
      progress.value = { done: index, total: renders.length, current: file.name };
      triggerDownload(file.url, file.name);
      saved.push(render.id);
      await wait(DOWNLOAD_GAP_MS);
    }
    remember(saved);
    return { saved, failed: renders.length - saved.length };
  };

  const save = async (renders: readonly RenderJobDto[]): Promise<string[]> => {
    if (renders.length === 0 || controller) return [];
    // The folder dialog must open straight from the click, before anything else is awaited.
    const folder = toFolder
      ? await pickFolder().catch((error: unknown) => {
          notify.error('Could not open the folder', error);
          return null;
        })
      : null;
    if (toFolder && !folder) return [];
    controller = new AbortController();
    const { signal } = controller;
    progress.value = { done: 0, total: renders.length, current: null };
    try {
      const { saved, failed } = folder
        ? await intoFolder(folder, renders, signal)
        : await asDownloads(renders, signal);
      const where = folder ? ` to “${folder.name}”` : '';
      if (signal.aborted) {
        notify.info(`Stopped: ${String(saved.length)} of ${String(renders.length)} saved${where}`);
      } else if (failed > 0) {
        notify.warning(
          `${String(saved.length)} saved${where}, ${String(failed)} failed`,
          'The failed ones stay selected: try again.',
        );
      } else {
        notify.success(`${String(saved.length)} ${saved.length === 1 ? 'file' : 'files'} saved${where}`);
      }
      return saved;
    } catch (error) {
      notify.error('Could not save the files', error);
      return [];
    } finally {
      controller = null;
      progress.value = null;
    }
  };

  return {
    toFolder,
    saving: computed(() => progress.value !== null),
    progress: readonly(progress),
    saveSelected: async () => {
      selection.remove(await save(selection.items.value));
    },
    stop: () => {
      controller?.abort();
    },
    markDownloaded: (render) => {
      remember([render.id]);
    },
  };
};

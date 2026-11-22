// Saving files from the browser: into a folder the owner picks (File System Access API, Chrome)
// or, where that is missing, as plain downloads. Browser APIs only; no Vue.

interface DirectoryPickerOptions {
  /** Chrome remembers the last folder per id. */
  readonly id?: string;
  readonly mode?: 'read' | 'readwrite';
  readonly startIn?: 'downloads' | 'desktop' | 'documents' | 'videos';
}

type DirectoryPicker = (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;

const directoryPicker = (): DirectoryPicker | null => {
  const picker = (window as { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker;
  return typeof picker === 'function' ? picker.bind(window) : null;
};

/** Whether the browser can write into a picked folder (Chrome on localhost / https). */
export const canPickFolder = (): boolean => window.isSecureContext && directoryPicker() !== null;

/** Asks for a folder; null when the owner closes the dialog. */
export const pickFolder = async (): Promise<FileSystemDirectoryHandle | null> => {
  const picker = directoryPicker();
  if (!picker) return null;
  try {
    return await picker({ id: 'vgen-renders', mode: 'readwrite', startIn: 'downloads' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
};

/** Names already in the folder (lower case: macOS and Windows folders ignore case). */
export const folderNames = async (folder: FileSystemDirectoryHandle): Promise<Set<string>> => {
  const names = new Set<string>();
  for await (const name of (folder as unknown as { keys: () => AsyncIterable<string> }).keys()) {
    names.add(name.toLowerCase());
  }
  return names;
};

/** `name`, or `name (2).ext`, `name (3).ext`… — the first one not in `taken` (lower case). */
export const uniqueFileName = (name: string, taken: ReadonlySet<string>): string => {
  if (!taken.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  for (let index = 2; ; index += 1) {
    const candidate = `${base} (${String(index)})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
};

/**
 * Downloads `url` straight into a new file `name` of the folder, streamed (a video is never held
 * in memory). A failed or stopped download leaves no file behind.
 */
export const saveUrlToFolder = async (
  folder: FileSystemDirectoryHandle,
  url: string,
  name: string,
  signal?: AbortSignal,
): Promise<void> => {
  const response = await fetch(url, signal ? { signal } : {});
  if (!response.ok || !response.body) {
    throw new Error(`Could not download ${name} (HTTP ${String(response.status)})`);
  }
  const handle = await folder.getFileHandle(name, { create: true });
  try {
    const writable = await handle.createWritable();
    await response.body.pipeTo(writable, signal ? { signal } : {});
  } catch (error) {
    await folder.removeEntry(name).catch(() => undefined);
    throw error;
  }
};

/** A plain browser download (the browser decides where it goes). */
export const triggerDownload = (url: string, name: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
};

import type { MediaKind, MediaRole, RenderEvent, RenderStatus } from '@vgen/shared';

/** Render job as seen by workers. */
export interface RenderJobRecord {
  readonly id: string;
  readonly status: RenderStatus;
  readonly engine: string;
  readonly templateId: string;
  readonly templateVersion: string;
  readonly props: unknown;
  readonly quality: string;
  readonly outputName: string;
}

/** Persistence of job state. Transitions are conditional so cancels and retries cannot race. */
export interface RenderJobStore {
  find(id: string): Promise<RenderJobRecord | null>;
  /** queued (or rendering, for a retry/stalled job) -> rendering. False if the job is no longer runnable. */
  markRendering(id: string, engineVersion: string): Promise<boolean>;
  updateProgress(id: string, progress: number): Promise<void>;
  markDone(id: string, result: { outputAssetId: string; thumbnailAssetId: string | null }): Promise<boolean>;
  markFailed(id: string, error: string): Promise<boolean>;
  /** A failed attempt that will be retried goes back to the queue. */
  markRetrying(id: string, error: string): Promise<boolean>;
}

export interface MediaAssetRecord {
  readonly id: string;
  readonly kind: MediaKind;
  readonly mime: string;
  readonly storageKey: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly durationSec: number | null;
}

export interface NewMediaAsset {
  readonly kind: MediaKind;
  readonly role: MediaRole;
  readonly originalName: string;
  readonly mime: string;
  readonly size: number;
  readonly storageKey: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly durationSec: number | null;
}

export interface MediaAssetStore {
  findByIds(ids: readonly string[]): Promise<MediaAssetRecord[]>;
  create(asset: NewMediaAsset): Promise<MediaAssetRecord>;
}

export interface MusicTrackRecord {
  readonly asset: MediaAssetRecord;
  readonly durationSec: number;
}

export interface MusicLibrary {
  /** A specific track, or the library default when `trackId` is null. */
  resolve(trackId: string | null): Promise<MusicTrackRecord | null>;
}

export interface RenderEventPublisher {
  publish(event: RenderEvent): Promise<void>;
}

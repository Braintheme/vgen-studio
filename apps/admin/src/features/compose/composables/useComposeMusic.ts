import type { MusicTrackDto, ResolvedAudio } from '@vgen/shared';
import { computed, watch, type ComputedRef, type Ref, type WritableComputedRef } from 'vue';
import { valueAtPath } from '@/lib/utils';
import { useMusicTracksQuery, useWaveformPeaksQuery } from '@/queries/music';
import { MUSIC_PATHS } from '@/lib/music';
import { MUSIC_START_DECIMALS } from '@/features/compose/constants';
import type { WaveformSource } from '@/lib/waveform-region';
import type { MusicNotice, MusicWidgetsView } from '@/features/compose/types';
import type { SettingsValues, TemplateSettings } from './useComposeForm';

export interface ComposeMusicDeps {
  /** Reactive form values. */
  readonly values: Readonly<SettingsValues>;
  /** Last valid settings (video duration). */
  readonly settings: Readonly<Ref<TemplateSettings>>;
  readonly setFieldValue: (path: string, value: unknown) => void;
  /** Reports an automatic fix (e.g. a deleted track) to the user. */
  readonly report: (line: string) => void;
}

export interface ComposeMusicState {
  /** What the music widgets show. */
  readonly view: ComputedRef<MusicWidgetsView>;
  /** Chosen track id; `null` = the library default. */
  readonly trackId: WritableComputedRef<string | null>;
  readonly startSec: WritableComputedRef<number>;
  /** Audio for the live preview. */
  readonly previewAudio: ComputedRef<ResolvedAudio | null>;
}

const roundStart = (seconds: number): number => {
  const scale = 10 ** MUSIC_START_DECIMALS;
  return Math.max(0, Math.round(seconds * scale) / scale);
};

/**
 * The music part of the compose screen: track choice (library default unless one is
 * picked), the fragment on the waveform, the preview audio and "will be silent" notices.
 */
export const useComposeMusic = ({
  values,
  settings,
  setFieldValue,
  report,
}: ComposeMusicDeps): ComposeMusicState => {
  const query = useMusicTracksQuery();
  const tracks = computed<readonly MusicTrackDto[]>(() => query.data.value ?? []);
  const defaultTrack = computed(() => tracks.value.find((track) => track.isDefault) ?? null);

  const enabled = computed(() => valueAtPath(values, MUSIC_PATHS.enabled) === true);
  const trackId = computed<string | null>({
    get: () => {
      const id = valueAtPath(values, MUSIC_PATHS.trackId);
      return typeof id === 'string' ? id : null;
    },
    set: (id) => {
      setFieldValue(MUSIC_PATHS.trackId, id);
      setFieldValue(MUSIC_PATHS.startSec, 0);
    },
  });
  const startSec = computed<number>({
    get: () => {
      const start = valueAtPath(values, MUSIC_PATHS.startSec);
      return typeof start === 'number' ? start : 0;
    },
    set: (start) => {
      setFieldValue(MUSIC_PATHS.startSec, roundStart(start));
    },
  });

  const track = computed(() =>
    trackId.value === null
      ? defaultTrack.value
      : (tracks.value.find((candidate) => candidate.id === trackId.value) ?? null),
  );
  const videoSec = computed(() => settings.value.durationSec);
  const regionSec = computed(() => Math.min(videoSec.value, track.value?.durationSec ?? videoSec.value));

  // A track deleted from the library (chosen in a draft or a preset) falls back to the default.
  watch(
    () => trackId.value !== null && query.isSuccess.value && !query.isFetching.value && track.value === null,
    (missing) => {
      if (!missing) return;
      trackId.value = null;
      report('The selected music track was deleted, so the library default plays instead.');
    },
    { immediate: true },
  );

  // Keep the fragment inside the track when the track or the video length changes.
  watch([track, regionSec], ([current, length]) => {
    if (!current) return;
    const maxStart = Math.max(0, current.durationSec - length);
    if (startSec.value > maxStart) startSec.value = maxStart;
  });

  const peaks = useWaveformPeaksQuery(() => track.value?.peaksUrl ?? null);
  const waveform = computed<WaveformSource | null>(() => {
    const current = track.value;
    if (!current) return null;
    if (current.peaksUrl !== null && !peaks.data.value) return null;
    return { url: current.url, peaks: peaks.data.value?.peaks ?? null, durationSec: current.durationSec };
  });

  const notice = computed<MusicNotice | null>(() => {
    if (!enabled.value || !query.isSuccess.value) return null;
    if (tracks.value.length === 0) return 'library-empty';
    if (!track.value) return 'no-default';
    return track.value.durationSec < videoSec.value ? 'track-loops' : null;
  });

  return {
    view: computed(() => ({
      enabled: enabled.value,
      tracks: tracks.value,
      defaultTrack: defaultTrack.value,
      regionSec: regionSec.value,
      waveform: waveform.value,
      notice: notice.value,
    })),
    trackId,
    startSec,
    previewAudio: computed(() =>
      enabled.value && track.value ? { src: track.value.url, durationSec: track.value.durationSec } : null,
    ),
  };
};

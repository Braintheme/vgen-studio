// Framework-free controller for a waveform with one fixed-length, draggable region
// (the music fragment). Wraps wavesurfer.js; components drive it from props.
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/plugins/regions';

/** What to draw: precomputed peaks (no decoding in the browser), or null to decode the file. */
export interface WaveformSource {
  readonly url: string;
  readonly peaks: readonly number[] | null;
  readonly durationSec: number;
}

export interface WaveformRegionState {
  readonly startSec: number;
  readonly lengthSec: number;
  readonly disabled: boolean;
}

export interface WaveformRegionCallbacks {
  readonly onReady: () => void;
  readonly onPlayingChange: (playing: boolean) => void;
  /** The user dropped the region at a new start. */
  readonly onMove: (startSec: number) => void;
}

export interface WaveformRegionController {
  readonly update: (state: WaveformRegionState) => void;
  /** Plays the region, or pauses when playing. */
  readonly togglePlay: () => void;
  /** Re-reads the theme colors (call after a light/dark switch). */
  readonly refreshColors: () => void;
  readonly destroy: () => void;
}

const WAVEFORM_HEIGHT_PX = 64;
const REGION_COLOR = 'color-mix(in oklch, var(--primary) 22%, transparent)';

/** Theme colors for the canvas (CSS variables resolved at creation time). */
const themeColor = (element: HTMLElement, variable: string): string =>
  getComputedStyle(element).getPropertyValue(variable).trim();

export const createWaveformRegion = (
  container: HTMLElement,
  source: WaveformSource,
  initial: WaveformRegionState,
  callbacks: WaveformRegionCallbacks,
): WaveformRegionController => {
  let state = initial;
  let region: Region | null = null;

  const colors = () => ({
    waveColor: themeColor(container, '--muted-foreground'),
    progressColor: themeColor(container, '--primary'),
  });

  const wavesurfer = WaveSurfer.create({
    container,
    url: source.url,
    peaks: source.peaks ? [[...source.peaks]] : undefined,
    duration: source.durationSec,
    height: WAVEFORM_HEIGHT_PX,
    ...colors(),
    cursorWidth: 0,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    interact: false,
  });
  const regions = wavesurfer.registerPlugin(RegionsPlugin.create());

  wavesurfer.on('ready', () => {
    region = regions.addRegion({
      start: state.startSec,
      end: state.startSec + state.lengthSec,
      drag: !state.disabled,
      resize: false,
      color: REGION_COLOR,
    });
    region.on('update-end', () => {
      if (region) callbacks.onMove(region.start);
    });
    callbacks.onReady();
  });
  wavesurfer.on('play', () => {
    callbacks.onPlayingChange(true);
  });
  wavesurfer.on('pause', () => {
    callbacks.onPlayingChange(false);
  });
  wavesurfer.on('finish', () => {
    callbacks.onPlayingChange(false);
  });

  return {
    update: (next) => {
      state = next;
      if (!region || region.isDragging) return;
      region.setOptions({ start: next.startSec, end: next.startSec + next.lengthSec, drag: !next.disabled });
    },
    togglePlay: () => {
      if (!region) return;
      if (wavesurfer.isPlaying()) wavesurfer.pause();
      else void wavesurfer.play(region.start, region.end);
    },
    refreshColors: () => {
      wavesurfer.setOptions(colors());
    },
    destroy: () => {
      wavesurfer.destroy();
      region = null;
    },
  };
};

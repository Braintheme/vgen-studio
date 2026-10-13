import type React from 'react';
import { Audio } from '@remotion/media';
import type { Music, ResolvedAudio } from '@vgen/shared';
import { interpolate, useVideoConfig } from 'remotion';

export interface MusicLayerProps {
  readonly track: ResolvedAudio | null;
  readonly settings: Music;
}

/** Background music: a fragment starting at `startSec`, with volume and fades. */
export const MusicLayer: React.FC<MusicLayerProps> = ({ track, settings }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!track || !settings.enabled) {
    return null;
  }
  const fadeIn = Math.max(1, Math.round(settings.fadeInSec * fps));
  const fadeOut = Math.max(1, Math.round(settings.fadeOutSec * fps));
  const volume = (frame: number): number =>
    settings.volume *
    interpolate(frame, [0, fadeIn, durationInFrames - fadeOut, durationInFrames], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  // Loop when the chosen fragment is shorter than the video.
  const loop = track.durationSec - settings.startSec < durationInFrames / fps;
  return (
    <Audio src={track.src} trimBefore={Math.round(settings.startSec * fps)} volume={volume} loop={loop} />
  );
};

import type React from 'react';
import { Audio } from '@remotion/media';
import type { Music, ResolvedAudio } from '@vgen/shared';
import { interpolate, Sequence, useVideoConfig } from 'remotion';

export interface MusicEnd {
  /** Frame at which the music is gone (e.g. where another track takes over). */
  readonly at: number;
  /** Fade-out before `at`, frames. */
  readonly fadeFrames: number;
}

export interface MusicLayerProps {
  readonly track: ResolvedAudio | null;
  readonly settings: Music;
  /** Ends the music early (a crossfade into another sound); the whole video when omitted. */
  readonly end?: MusicEnd;
}

/** Background music: a fragment starting at `startSec`, with volume and fades. */
export const MusicLayer: React.FC<MusicLayerProps> = ({ track, settings, end }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!track || !settings.enabled) {
    return null;
  }
  const length = end ? Math.max(1, Math.min(durationInFrames, end.at)) : durationInFrames;
  const fadeIn = Math.max(1, Math.round(settings.fadeInSec * fps));
  const fadeOut = Math.max(1, end ? end.fadeFrames : Math.round(settings.fadeOutSec * fps));
  const volume = (frame: number): number =>
    settings.volume *
    interpolate(frame, [0, fadeIn, length - fadeOut, length], [0, 1, 1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  // Loop when the chosen fragment is shorter than the music's part of the video.
  const loop = track.durationSec - settings.startSec < length / fps;
  const audio = (
    <Audio src={track.src} trimBefore={Math.round(settings.startSec * fps)} volume={volume} loop={loop} />
  );
  return end ? (
    <Sequence durationInFrames={length} layout="none">
      {audio}
    </Sequence>
  ) : (
    audio
  );
};

import type React from 'react';
import { Audio } from '@remotion/media';
import type { ResolvedAudio, SoundEffect } from '@vgen/shared';
import { Sequence } from 'remotion';
import shutterUrl from './sfx/shutter.wav';
import swooshUrl from './sfx/swoosh.wav';
import tickUrl from './sfx/tick.wav';

/** Built-in sounds (synthesized by `pnpm --filter @vgen/devtools sfx`, license-free). */
export const BUILT_IN_SOUNDS = {
  shutter: { src: shutterUrl, durationSec: 0.32 },
  swoosh: { src: swooshUrl, durationSec: 0.75 },
  tick: { src: tickUrl, durationSec: 0.14 },
} as const satisfies Record<string, ResolvedAudio>;

export type BuiltInSound = keyof typeof BUILT_IN_SOUNDS;

/** A library track used as a cue plays at most this long (unless the cue says otherwise). */
const MAX_CUE_SEC = 8;

export interface SoundCueProps {
  /** Frame at which the sound starts (`align: 'start'`) or has its middle (`'center'`). */
  readonly at: number;
  /** `center` keeps a sound of any length centered on a moment (e.g. a swoosh on a wipe). */
  readonly align?: 'start' | 'center';
  readonly cue: SoundEffect;
  /** The chosen library track, if any (`ResolvedAssets.sounds[cue]`). */
  readonly track: ResolvedAudio | undefined;
  readonly builtIn: BuiltInSound;
  readonly fps: number;
  /** Longest a library track plays, seconds (a whole music bed may run longer). */
  readonly maxSec?: number;
  /** Fade-in, frames (a crossfade from the music); none when omitted. */
  readonly fadeInFrames?: number;
}

/** A one-shot sound effect: the user's library track, or the engine's built-in sound. */
export const SoundCue: React.FC<SoundCueProps> = ({
  at,
  align = 'start',
  cue,
  track,
  builtIn,
  fps,
  maxSec = MAX_CUE_SEC,
  fadeInFrames = 0,
}) => {
  if (!cue.enabled || cue.volume <= 0) return null;
  const sound = track ?? BUILT_IN_SOUNDS[builtIn];
  const frames = Math.max(1, Math.ceil(Math.min(sound.durationSec, maxSec) * fps));
  const from = align === 'center' ? at - Math.round(frames / 2) : at;
  // A sound that would start before the video begins is trimmed, not moved.
  const trim = Math.max(0, -from);
  return (
    <Sequence from={from + trim} durationInFrames={Math.max(1, frames - trim)} layout="none">
      <Audio
        src={sound.src}
        volume={
          fadeInFrames > 0
            ? (frame: number) => cue.volume * Math.min(1, (frame + trim + 1) / fadeInFrames)
            : cue.volume
        }
        trimBefore={trim}
      />
    </Sequence>
  );
};

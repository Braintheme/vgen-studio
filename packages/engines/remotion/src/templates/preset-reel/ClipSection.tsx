import type { ResolvedVideo } from '@vgen/shared';
import type React from 'react';
import { placeholderImage } from '../../core/composition.js';
import { fontFamily } from '../../core/fonts.js';
import type { Layout } from '../../core/layout.js';
import { ease, mix, progress } from '../../core/motion.js';
import { VideoPlane } from '../../core/primitives/VideoPlane.js';
import { AccentTitle } from '../../core/typography/AccentTitle.js';
import type { PresetReelProps } from './manifest.js';
import { TIMING, type ReelTimeline } from './timeline.js';

const CLIP_PLACEHOLDER = placeholderImage('CLIP', '#2b3138', '#121519');

/** Design sizes at 1080 px on the short side (references/2, "Medium"). */
const TITLE_PX = { lead: 61, hero: 97, tail: 68 } as const;
const TITLE_SCALE = { s: 0.85, m: 1, l: 1.15 } as const;
const TEXT_SHADOW = '0 2px 12px rgba(0,0,0,0.35)';
/** Fades the clip sound out over its last frames (no click at the cut). */
const AUDIO_FADE_SEC = 0.15;

export interface ClipSectionProps {
  readonly frame: number;
  readonly fps: number;
  readonly layout: Layout;
  readonly props: PresetReelProps;
  readonly video: ResolvedVideo | null;
  readonly timeline: ReelTimeline;
}

/** The user's clip (framed, with an optional punch-in) and the styled title over it. */
export const ClipSection: React.FC<ClipSectionProps> = ({ frame, fps, layout, props, video, timeline }) => {
  const { params, texts, style } = props;
  const frames = (sec: number) => Math.round(sec * fps);

  const punch = timeline.punchIn
    ? progress(frame, timeline.punchIn.from, timeline.punchIn.duration, ease.outCubic)
    : 0;
  const clipFrames = timeline.clip.to - timeline.clip.from;
  const fadeFrames = Math.max(1, frames(AUDIO_FADE_SEC));
  const volume = params.clipAudio.enabled
    ? (local: number) => params.clipAudio.volume * Math.min(1, Math.max(0, (clipFrames - local) / fadeFrames))
    : 0;

  const scale = TITLE_SCALE[params.titleSize];
  const heading = fontFamily(style.fonts.heading);
  const shown = [
    {
      field: texts.titleLead,
      style: {
        fontFamily: heading,
        fontWeight: 300,
        fontStyle: 'italic',
        fontSize: TITLE_PX.lead * scale * layout.unit,
        lineHeight: 1.18,
        color: style.colors.accent,
      },
    },
    {
      field: texts.titleHero,
      style: {
        fontFamily: heading,
        fontWeight: 900,
        fontStyle: 'italic',
        fontSize: TITLE_PX.hero * scale * layout.unit,
        lineHeight: 0.92,
        letterSpacing: '-0.01em',
        color: style.colors.text,
      },
    },
    {
      field: texts.titleTail,
      style: {
        fontFamily: heading,
        fontWeight: 500,
        fontSize: TITLE_PX.tail * scale * layout.unit,
        lineHeight: 1.5,
        color: style.colors.text,
      },
    },
  ].filter((line) => line.field.enabled && line.field.value.trim().length > 0);
  const lines = shown.map((line, index) => ({
    text: line.field.value,
    style: { ...line.style, textShadow: TEXT_SHADOW },
    enter:
      params.titleAnimation === 'none'
        ? 1
        : progress(
            frame,
            frames(TIMING.titleIn + index * TIMING.titleStagger),
            frames(TIMING.titleRise),
            ease.outQuint,
          ),
  }));
  const exit =
    timeline.titleExit === null
      ? 0
      : progress(frame, timeline.titleExit, frames(TIMING.titleOut), ease.inCubic);
  const top = Math.max(layout.safe.top, layout.height * (layout.orientation === 'portrait' ? 0.155 : 0.1));

  return (
    <>
      <VideoPlane
        video={video}
        placeholder={CLIP_PLACEHOLDER}
        framing={params.framing}
        focusZoom={{ scale: mix(1, params.punchIn.scale, punch), x: params.punchIn.x, y: params.punchIn.y }}
        durationInFrames={clipFrames}
        volume={volume}
        grade={params.clipGrade}
      />
      <AccentTitle
        lines={lines}
        accentStyle={{
          fontFamily: fontFamily(params.titleAccentFont),
          fontWeight: 700,
          fontStyle: 'normal',
          letterSpacing: '0.05em',
          marginLeft: '0.3em',
          color: style.colors.accent,
        }}
        x={layout.width / 2}
        y={top}
        exit={exit}
      />
    </>
  );
};

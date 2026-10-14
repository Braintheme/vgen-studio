import type React from 'react';
import { Video } from '@remotion/media';
import type { ResolvedVideo } from '@vgen/shared';
import { AbsoluteFill, Freeze, Img, useCurrentFrame, useVideoConfig } from 'remotion';

/** Reframing of a video inside the frame: zoom >= 1 and a pan of -1..1 per axis (0 = centered). */
export interface VideoFraming {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

/** A zoom about a point of the frame (-1..1 per axis, 0 = center); `scale` 1 = none. */
export interface FocusZoom {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface VideoPlaneProps {
  readonly video: ResolvedVideo | null;
  /** Shown while no video is uploaded (live preview). */
  readonly placeholder: string;
  readonly framing: VideoFraming;
  readonly focusZoom?: FocusZoom;
  /** Length of the fragment, frames; later frames hold its last frame. */
  readonly durationInFrames: number;
  /** 0 mutes the clip. Either a constant or a per-frame curve. */
  readonly volume: number | ((frame: number) => number);
}

/** Pan offsets (px) of a cover-fitted media of `size` zoomed by `zoom` inside `frame`. */
export const framingOffset = (
  size: { readonly width: number; readonly height: number },
  frame: { readonly width: number; readonly height: number },
  framing: VideoFraming,
): { readonly width: number; readonly height: number; readonly x: number; readonly y: number } => {
  const cover = Math.max(frame.width / size.width, frame.height / size.height);
  const width = size.width * cover;
  const height = size.height * cover;
  const zoom = Math.max(1, framing.zoom);
  return {
    width,
    height,
    x: -framing.x * Math.max(0, (width * zoom - frame.width) / 2),
    y: -framing.y * Math.max(0, (height * zoom - frame.height) / 2),
  };
};

/**
 * A video fragment filling the frame: cover-fitted, reframed (zoom + pan) and optionally
 * zoomed about a focus point (punch-ins). Everything moves by transforms only.
 */
export const VideoPlane: React.FC<VideoPlaneProps> = ({
  video,
  placeholder,
  framing,
  focusZoom,
  durationInFrames,
  volume,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const size = video ?? { width, height };
  const fit = framingOffset(size, { width, height }, framing);
  const zoom = Math.max(1, framing.zoom);
  const punch = focusZoom ?? { scale: 1, x: 0, y: 0 };
  // Zooming about P keeps P in place: v' = P + s (v - P) = s v + (1 - s) P.
  const px = (punch.x * width) / 2;
  const py = (punch.y * height) / 2;
  const outer = `translate(${((1 - punch.scale) * px).toFixed(3)}px, ${((1 - punch.scale) * py).toFixed(3)}px) scale(${punch.scale.toFixed(5)})`;
  const inner = `translate(${fit.x.toFixed(3)}px, ${fit.y.toFixed(3)}px) scale(${zoom.toFixed(5)})`;
  const media: React.CSSProperties = {
    position: 'absolute',
    left: (width - fit.width) / 2,
    top: (height - fit.height) / 2,
    width: fit.width,
    height: fit.height,
  };
  const silent = typeof volume === 'number' && volume <= 0;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: outer, transformOrigin: '50% 50%' }}>
        <AbsoluteFill style={{ transform: inner, transformOrigin: '50% 50%' }}>
          {video ? (
            <Freeze frame={Math.max(0, durationInFrames - 1)} active={frame >= durationInFrames}>
              <Video
                src={video.src}
                trimBefore={Math.round(video.startSec * fps)}
                objectFit="fill"
                style={media}
                muted={silent || !video.hasAudio}
                volume={volume}
              />
            </Freeze>
          ) : (
            <Img src={placeholder} style={{ ...media, objectFit: 'cover' }} />
          )}
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

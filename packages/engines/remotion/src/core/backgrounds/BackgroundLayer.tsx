import type React from 'react';
import { AbsoluteFill } from 'remotion';
import type { Layout } from '../layout.js';
import { BACKGROUNDS, type BackgroundId } from './registry.js';

export interface BackgroundLayerProps {
  readonly background: BackgroundId;
  readonly timeSec: number;
  readonly layout: Layout;
  readonly seed: number;
  readonly base: string;
  readonly accent: string;
}

/** Renders a registered animated background. */
export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ background, ...input }) => (
  <AbsoluteFill style={{ overflow: 'hidden' }}>
    {BACKGROUNDS.get(background)
      .layers(input)
      .map((style, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            ...(style as React.CSSProperties),
          }}
        />
      ))}
  </AbsoluteFill>
);

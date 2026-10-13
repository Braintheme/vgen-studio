import type React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontFamily } from '../../../core/fonts.js';
import type { Layout } from '../../../core/layout.js';
import { ease, progress } from '../../../core/motion.js';
import { Label } from '../../../core/primitives/Label.js';
import { LightSweep } from '../../../core/primitives/LightSweep.js';
import { PhotoPlane } from '../../../core/primitives/PhotoPlane.js';
import { RevealEffect } from '../../../core/reveals/RevealEffect.js';
import type { BeforeAfterProps } from '../manifest.js';
import { showcaseCamera } from '../camera.js';
import type { BeforeAfterTimeline } from '../timeline.js';
import { Finale } from './Finale.js';

export interface ShowcaseProps {
  readonly before: string;
  readonly after: string;
  readonly props: BeforeAfterProps;
  readonly timeline: BeforeAfterTimeline;
  readonly layout: Layout;
}

const labelText = (field: { enabled: boolean; value: string }): string | null =>
  field.enabled && field.value ? field.value : null;

/** BEFORE -> reveal -> AFTER -> finale, under one continuous camera move. */
export const Showcase: React.FC<ShowcaseProps> = ({ before, after, props, timeline, layout }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { body } = timeline;
  const { style, texts, params } = props;
  const camera = showcaseCamera(frame, timeline, params.motion, layout.width, layout.height);

  const context = {
    layout,
    accent: style.colors.accent,
    textColor: style.colors.text,
    radius: style.radius,
    labelFont: fontFamily(style.fonts.body),
    beforeLabel: labelText(texts.beforeLabel),
    afterLabel: labelText(texts.afterLabel),
    seed: props.seed,
  };
  const renderBefore = (): React.ReactNode => <PhotoPlane src={before} camera={camera} />;
  const renderAfter = (): React.ReactNode => <PhotoPlane src={after} camera={camera} />;

  let scene: React.ReactNode;
  if (frame < body.reveal.from) {
    scene = renderBefore();
  } else if (frame < body.after.from) {
    scene = (
      <RevealEffect
        {...context}
        effect={params.revealEffect}
        progress={progress(frame, body.reveal.from, body.reveal.durationInFrames)}
        renderBefore={renderBefore}
        renderAfter={renderAfter}
      />
    );
  } else if (frame < body.finale.from) {
    scene = (
      <AbsoluteFill>
        {renderAfter()}
        <LightSweep
          progress={progress(frame, body.after.from + 6, Math.round(1.2 * fps), ease.inOutSine)}
          intensity={0.32}
          width={9}
        />
      </AbsoluteFill>
    );
  } else {
    scene = (
      <Finale
        {...context}
        kind={params.finale}
        effect={params.revealEffect}
        frame={frame - body.finale.from}
        duration={body.finale.durationInFrames}
        renderBefore={renderBefore}
        renderAfter={renderAfter}
      />
    );
  }

  // Labels drift slightly against the camera for a hint of depth (parallax).
  const parallax = -camera.x * layout.width * 0.6;
  const labelProps = {
    x: layout.safe.left + 8 * layout.unit + parallax,
    y: layout.safe.top + 24 * layout.unit,
    unit: layout.unit,
    fontFamily: context.labelFont,
    textColor: style.colors.text,
    radius: style.radius,
  };

  return (
    <AbsoluteFill>
      {scene}
      {context.beforeLabel ? (
        <Label
          {...labelProps}
          text={context.beforeLabel}
          accent="rgba(255,255,255,0.85)"
          enter={progress(frame, 6, 18)}
          exit={progress(frame, body.reveal.from - 4, 10)}
        />
      ) : null}
      {context.afterLabel ? (
        <Label
          {...labelProps}
          text={context.afterLabel}
          accent={style.colors.accent}
          enter={progress(frame, body.after.from + 6, 18)}
          exit={progress(frame, body.finale.from - 6, 8)}
        />
      ) : null}
    </AbsoluteFill>
  );
};

import type React from 'react';
import { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { MusicLayer } from '../../core/audio/MusicLayer.js';
import { imageAsset, placeholderImage, type RemotionTemplateProps } from '../../core/composition.js';
import { fontFamily, useFonts } from '../../core/fonts.js';
import { useLayout } from '../../core/hooks.js';
import { PaletteGradeScene } from '../../core/palette-grade/PaletteGradeScene.js';
import { gradeTimeline } from '../../core/palette-grade/timeline.js';
import { useAdjustedPhoto } from '../../core/photo-adjust/useAdjustedPhoto.js';
import { Grain, Vignette } from '../../core/primitives/Overlays.js';
import type { PaletteGradeProps } from './manifest.js';

const BEFORE_PLACEHOLDER = placeholderImage('BEFORE', '#6f7a68', '#3d4637');
const AFTER_PLACEHOLDER = placeholderImage('AFTER', '#3a2a26', '#0f1417');

export const PaletteGrade: React.FC<RemotionTemplateProps<PaletteGradeProps>> = ({ props, assets }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const { style, texts, params } = props;
  const fontsLoaded = useFonts([style.fonts.heading]);
  const timeline = useMemo(
    () =>
      gradeTimeline({
        durationSec: props.durationSec,
        fps,
        introHoldSec: params.introHoldSec,
        speed: params.processSpeed,
      }),
    [props.durationSec, fps, params.introHoldSec, params.processSpeed],
  );
  const before = useAdjustedPhoto(
    imageAsset(assets.media, 'before')?.src ?? BEFORE_PLACEHOLDER,
    props.params.adjust.before,
  );
  const after = useAdjustedPhoto(
    imageAsset(assets.media, 'after')?.src ?? AFTER_PLACEHOLDER,
    props.params.adjust.after,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      <PaletteGradeScene
        frame={frame}
        fps={fps}
        layout={layout}
        timeline={timeline}
        before={before}
        after={after}
        params={params}
        texts={texts}
        fontFamily={fontFamily(style.fonts.heading)}
        textColor={style.colors.text}
        seed={props.seed}
        fontsLoaded={fontsLoaded}
      />
      <Vignette strength={style.vignette} />
      <Grain strength={style.grain} seed={props.seed} />
      <MusicLayer track={assets.music} settings={props.music} />
    </AbsoluteFill>
  );
};

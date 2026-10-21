import { Player, type PlayerRef } from '@remotion/player';
import type { PlayerInput, PlayerState } from '@vgen/shared';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ResolvedAssetsSchema } from '../core/composition.js';
import { findRemotionTemplate } from '../templates/index.js';

export interface PreviewPlayerProps {
  readonly input: PlayerInput;
  readonly onReady: (player: PlayerRef) => void;
  readonly onState: (state: PlayerState) => void;
}

const pagerButton: React.CSSProperties = {
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  background: 'rgba(255,255,255,0.14)',
  color: '#ffffff',
  font: '500 13px/1 system-ui, sans-serif',
  cursor: 'pointer',
};

/** Image templates: one slide per frame, paged instead of played. */
const SlidePager: React.FC<{
  readonly player: React.RefObject<PlayerRef | null>;
  readonly count: number;
}> = ({ player, count }) => {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const current = player.current;
    if (!current) return undefined;
    const sync = (): void => {
      setSlide(current.getCurrentFrame());
    };
    current.addEventListener('frameupdate', sync);
    current.addEventListener('seeked', sync);
    return () => {
      current.removeEventListener('frameupdate', sync);
      current.removeEventListener('seeked', sync);
    };
  }, [player]);
  const go = (next: number): void => {
    const clamped = Math.min(count - 1, Math.max(0, next));
    player.current?.seekTo(clamped);
    setSlide(clamped);
  };
  const shown = Math.min(slide, count - 1);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: 8,
        background: '#000000',
        color: '#ffffff',
        font: '500 13px/1 system-ui, sans-serif',
      }}
    >
      <button
        type="button"
        style={pagerButton}
        disabled={shown <= 0}
        onClick={() => {
          go(shown - 1);
        }}
      >
        ‹ Prev
      </button>
      <span>
        Slide {shown + 1} / {count}
      </span>
      <button
        type="button"
        style={pagerButton}
        disabled={shown >= count - 1}
        onClick={() => {
          go(shown + 1);
        }}
      >
        Next ›
      </button>
    </div>
  );
};

/** The Remotion <Player> for one template, rendering the same composition as the worker. */
export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ input, onReady, onState }) => {
  const ref = useRef<PlayerRef>(null);
  const entry = findRemotionTemplate(input.template.id);
  // Host input is validated with the same schema the composition declares.
  const assets = useMemo(() => ResolvedAssetsSchema.parse(input.assets), [input.assets]);
  // The Player keeps the scale it measured for the first composition size: a format switch
  // drew the new one zoomed and shifted. A new size gets a new Player.
  const sizeKey = `${String(input.metadata.width)}x${String(input.metadata.height)}`;

  useEffect(() => {
    const player = ref.current;
    if (!player) return undefined;
    onReady(player);
    const emit = (): void => {
      onState({ frame: player.getCurrentFrame(), playing: player.isPlaying() });
    };
    player.addEventListener('frameupdate', emit);
    player.addEventListener('play', emit);
    player.addEventListener('pause', emit);
    return () => {
      player.removeEventListener('frameupdate', emit);
      player.removeEventListener('play', emit);
      player.removeEventListener('pause', emit);
    };
  }, [onReady, onState, sizeKey]);

  if (!entry) {
    return <div style={{ padding: 16, fontFamily: 'sans-serif' }}>Unknown template {input.template.id}</div>;
  }
  const { metadata } = input;
  if (input.template.output === 'stills') {
    return (
      <div key={sizeKey}>
        <Player
          ref={ref}
          component={entry.component}
          inputProps={{ props: input.props, assets }}
          durationInFrames={metadata.durationInFrames}
          fps={metadata.fps}
          compositionWidth={metadata.width}
          compositionHeight={metadata.height}
          style={{ width: '100%', aspectRatio: `${metadata.width} / ${metadata.height}` }}
          acknowledgeRemotionLicense
        />
        <SlidePager player={ref} count={metadata.durationInFrames} />
      </div>
    );
  }
  return (
    <Player
      key={sizeKey}
      ref={ref}
      component={entry.component}
      inputProps={{ props: input.props, assets }}
      durationInFrames={metadata.durationInFrames}
      fps={metadata.fps}
      compositionWidth={metadata.width}
      compositionHeight={metadata.height}
      style={{ width: '100%', aspectRatio: `${metadata.width} / ${metadata.height}` }}
      controls
      loop
      clickToPlay
      acknowledgeRemotionLicense
    />
  );
};

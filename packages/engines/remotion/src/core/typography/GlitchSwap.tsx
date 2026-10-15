import type React from 'react';
import { SUBPIXEL_TEXT_TRANSFORM } from '../placement.js';
import { glitchSwapState, graphemes } from './glitch-swap.js';

export interface GlitchSwapProps {
  readonly from: string;
  readonly to: string;
  /** 0..1 progress of the swap (0: `from` fully shown, 1: `to`). */
  readonly progress: number;
  readonly seed: number;
  /** Letter spacing in px (constant; applied per letter so the word stays centred). */
  readonly letterSpacing: number;
}

const Letters: React.FC<{
  readonly text: string;
  readonly opacity: readonly number[] | 'outline';
  readonly letterSpacing: number;
}> = ({ text, opacity, letterSpacing }) => {
  const letters = graphemes(text);
  return (
    <>
      {letters.map((letter, index) => (
        <span
          // Letters repeat; the index keeps keys unique and stable.
          key={`${String(index)}-${letter}`}
          style={{
            display: 'inline-block',
            whiteSpace: 'pre',
            // No trailing gap after the last letter: the word stays optically centred.
            marginRight: index < letters.length - 1 ? letterSpacing : 0,
            transform: SUBPIXEL_TEXT_TRANSFORM,
            ...(opacity === 'outline'
              ? // Outline only: the fill goes, the stroke keeps the inherited text colour.
                { WebkitTextFillColor: 'transparent', WebkitTextStroke: '1px currentColor', opacity: 0.85 }
              : { opacity: opacity[index] ?? 0 }),
          }}
        >
          {letter}
        </span>
      ))}
    </>
  );
};

/**
 * A word glitching into another one, letter by letter (see glitch-swap.ts). The current
 * layout word sizes its container (one snap, never animated); the other one is overlaid.
 */
export const GlitchSwap: React.FC<GlitchSwapProps> = ({ from, to, progress, seed, letterSpacing }) => {
  const state = glitchSwapState(from, to, progress, seed);
  const layoutText = state.layout === 'from' ? from : to;
  const overlayText = state.layout === 'from' ? to : from;
  const layoutOpacity = state.garble ? 'outline' : state.layout === 'from' ? state.from : state.to;
  const overlayOpacity = state.garble ? 'outline' : state.layout === 'from' ? state.to : state.from;
  const overlayVisible = state.garble || (overlayOpacity as readonly number[]).some((value) => value > 0);
  return (
    <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
      <Letters text={layoutText} opacity={layoutOpacity} letterSpacing={letterSpacing} />
      {overlayVisible ? (
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
          }}
        >
          <Letters text={overlayText} opacity={overlayOpacity} letterSpacing={letterSpacing} />
        </span>
      ) : null}
    </span>
  );
};

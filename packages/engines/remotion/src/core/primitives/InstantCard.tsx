import type React from 'react';

/**
 * Proportions of an instant-photo card (references/2), relative to the card width: a 4:5
 * photo window with a thin border on three sides and a deep caption strip below.
 */
const CARD = { inset: 0.0244, insetTop: 0.032, windowAspect: 4 / 5, caption: 0.294 } as const;

export interface InstantCardGeometry {
  readonly width: number;
  readonly height: number;
  readonly window: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
  readonly caption: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

/** Card geometry for a card `width` px wide. */
export const instantCardGeometry = (width: number): InstantCardGeometry => {
  const inset = width * CARD.inset;
  const insetTop = width * CARD.insetTop;
  const windowWidth = width - 2 * inset;
  const windowHeight = windowWidth / CARD.windowAspect;
  const captionHeight = width * CARD.caption;
  return {
    width,
    height: insetTop + windowHeight + captionHeight,
    window: { left: inset, top: insetTop, width: windowWidth, height: windowHeight },
    caption: { left: inset, top: insetTop + windowHeight, width: windowWidth, height: captionHeight },
  };
};

/** Height / width of the card. */
export const INSTANT_CARD_RATIO = instantCardGeometry(1).height;

export interface InstantCardProps {
  readonly geometry: InstantCardGeometry;
  readonly color: string;
  readonly radius: number;
  /** Shadow length, output pixels. */
  readonly shadow: number;
  /** Contents of the photo window (clipped to it). */
  readonly children: React.ReactNode;
  /** Contents of the caption strip. */
  readonly caption: React.ReactNode;
  readonly style?: React.CSSProperties;
}

/** An instant-photo style card: a photo window and a caption strip on a paper-white card. */
export const InstantCard: React.FC<InstantCardProps> = ({
  geometry,
  color,
  radius,
  shadow,
  children,
  caption,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: geometry.width,
      height: geometry.height,
      background: color,
      borderRadius: radius,
      boxShadow: `0 ${(shadow * 0.4).toFixed(1)}px ${shadow.toFixed(1)}px rgba(0,0,0,0.5), 0 ${(shadow * 0.05).toFixed(1)}px ${(shadow * 0.15).toFixed(1)}px rgba(0,0,0,0.3)`,
      ...style,
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: geometry.window.left,
        top: geometry.window.top,
        width: geometry.window.width,
        height: geometry.window.height,
        overflow: 'hidden',
        borderRadius: radius * 0.35,
        background: '#111',
      }}
    >
      {children}
    </div>
    <div
      style={{
        position: 'absolute',
        left: geometry.caption.left,
        top: geometry.caption.top,
        width: geometry.caption.width,
        height: geometry.caption.height,
      }}
    >
      {caption}
    </div>
  </div>
);

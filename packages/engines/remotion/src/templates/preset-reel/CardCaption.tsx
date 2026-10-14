import type React from 'react';

const CameraIcon: React.FC<{ readonly size: number; readonly color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flex: 'none' }}>
    <path d="M8.2 5.5 9.4 3.8h5.2l1.2 1.7H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h4.2Zm3.8 3a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z" />
  </svg>
);

const ApertureIcon: React.FC<{ readonly size: number; readonly color: string }> = ({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={1.8}
    style={{ flex: 'none' }}
  >
    <circle cx="12" cy="12" r="9.2" />
    <path d="M12 2.8 15.8 9.4M21.2 12h-7.6M17.2 19.6 13.4 13M6.8 19.6 10.6 13M2.8 12h7.6M6.8 4.4l3.8 6.6" />
  </svg>
);

export interface CardCaptionProps {
  /** Card width, output pixels: every size is relative to it (references/2). */
  readonly cardWidth: number;
  readonly fontFamily: string;
  readonly title: string | null;
  readonly lens: string | null;
  readonly exposure: string | null;
  readonly footer: string | null;
}

/** "Shot on ..." / lens and exposure with icons / the site line, on the card's caption strip. */
export const CardCaption: React.FC<CardCaptionProps> = ({
  cardWidth,
  fontFamily,
  title,
  lens,
  exposure,
  footer,
}) => {
  const w = cardWidth;
  const specSize = 0.029 * w;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0.028 * w,
        top: 0.052 * w,
        right: 0.028 * w,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.022 * w,
        fontFamily,
        whiteSpace: 'nowrap',
      }}
    >
      {title ? (
        <div style={{ fontSize: 0.045 * w, fontWeight: 700, color: '#141414', letterSpacing: '-0.005em' }}>
          {title}
        </div>
      ) : null}
      {lens || exposure ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4 * specSize,
            fontSize: specSize,
            fontWeight: 400,
            color: '#8b8b8b',
            letterSpacing: '0.01em',
          }}
        >
          {lens ? (
            <>
              <CameraIcon size={specSize * 1.05} color="#6f6f6f" />
              <span>{lens}</span>
            </>
          ) : null}
          {lens && exposure ? <span style={{ margin: `0 ${String(0.2 * specSize)}px` }}>-</span> : null}
          {exposure ? (
            <>
              <ApertureIcon size={specSize * 1.05} color="#6f6f6f" />
              <span style={{ whiteSpace: 'pre' }}>{exposure}</span>
            </>
          ) : null}
        </div>
      ) : null}
      {footer ? (
        <div style={{ fontSize: 0.031 * w, fontWeight: 400, color: '#262626', letterSpacing: '0.005em' }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
};

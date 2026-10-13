import type React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { cameraTransform, IDENTITY_CAMERA, type Camera } from './camera.js';

export interface PhotoPlaneProps {
  readonly src: string;
  readonly camera?: Camera;
  readonly style?: React.CSSProperties;
  readonly imageStyle?: React.CSSProperties;
}

/** A photo filling the frame (object-fit: cover) seen through a virtual camera. */
export const PhotoPlane: React.FC<PhotoPlaneProps> = ({
  src,
  camera = IDENTITY_CAMERA,
  style,
  imageStyle,
}) => (
  <AbsoluteFill style={{ overflow: 'hidden', ...style }}>
    <Img
      src={src}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: cameraTransform(camera),
        transformOrigin: '50% 50%',
        ...imageStyle,
      }}
    />
  </AbsoluteFill>
);

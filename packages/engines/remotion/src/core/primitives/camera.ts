/** Virtual camera over a full-frame photo. Offsets are fractions of the frame size. */
export interface Camera {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
  /** Degrees. */
  readonly rotate: number;
}

export const IDENTITY_CAMERA: Camera = { scale: 1, x: 0, y: 0, rotate: 0 };

/**
 * Smallest scale that keeps a frame-sized plane covering the frame after the
 * camera's translation and rotation (no empty corners ever show up).
 */
export const minCoverScale = (camera: Omit<Camera, 'scale'>, width: number, height: number): number => {
  const theta = (Math.abs(camera.rotate) * Math.PI) / 180;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const rotation = Math.cos(theta) + (long / short) * Math.sin(theta);
  const translation = 1 + 2 * Math.max(Math.abs(camera.x), Math.abs(camera.y));
  return rotation * translation;
};

export const coverCamera = (camera: Camera, width: number, height: number): Camera => ({
  ...camera,
  scale: Math.max(camera.scale, minCoverScale(camera, width, height)),
});

export const cameraTransform = (camera: Camera): string =>
  `translate(${(camera.x * 100).toFixed(4)}%, ${(camera.y * 100).toFixed(4)}%) scale(${camera.scale.toFixed(5)}) rotate(${camera.rotate.toFixed(4)}deg)`;

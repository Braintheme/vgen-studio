import { useVideoConfig } from 'remotion';
import { computeLayout, type Layout } from './layout.js';

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return computeLayout(width, height);
};

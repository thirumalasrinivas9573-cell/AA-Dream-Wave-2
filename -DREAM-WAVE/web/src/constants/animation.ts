/**
 * Shared animation timing constants (seconds).
 */

export const ANIMATION_DURATION = {
  instant: 0,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

export const ANIMATION_EASE = {
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
} as const;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)" as const;

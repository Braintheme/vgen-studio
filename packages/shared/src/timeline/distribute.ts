export interface TimelineSegmentSpec<Id extends string = string> {
  readonly id: Id;
  /** Relative share of the total duration. */
  readonly weight: number;
  /** Lower bound in frames (e.g. text needs time to be read). */
  readonly minFrames?: number;
}

export interface TimelineSegment<Id extends string = string> {
  readonly id: Id;
  readonly from: number;
  readonly durationInFrames: number;
}

/**
 * Splits `totalFrames` across segments proportionally to their weights while
 * honoring per-segment minimums. Integer frames; the sum always equals the total.
 */
export const distributeFrames = <Id extends string>(
  specs: readonly TimelineSegmentSpec<Id>[],
  totalFrames: number,
): TimelineSegment<Id>[] => {
  if (!Number.isInteger(totalFrames) || totalFrames <= 0) {
    throw new RangeError(`totalFrames must be a positive integer, got ${totalFrames}`);
  }
  if (specs.length === 0) {
    return [];
  }
  for (const spec of specs) {
    if (!(spec.weight > 0)) {
      throw new RangeError(`Segment "${spec.id}" must have a positive weight`);
    }
  }
  const minTotal = specs.reduce((sum, spec) => sum + (spec.minFrames ?? 0), 0);
  if (minTotal > totalFrames) {
    throw new RangeError(`Minimum durations (${minTotal} frames) exceed the total of ${totalFrames} frames`);
  }

  // Segments pinned to their minimum; the rest share the remaining frames by weight.
  const pinned = new Set<number>();
  let shares: number[] = [];
  for (;;) {
    const pinnedFrames = [...pinned].reduce((sum, index) => sum + (specs[index]?.minFrames ?? 0), 0);
    const freeWeight = specs.reduce((sum, spec, index) => (pinned.has(index) ? sum : sum + spec.weight), 0);
    const available = totalFrames - pinnedFrames;
    shares = specs.map((spec, index) =>
      pinned.has(index) ? (spec.minFrames ?? 0) : (available * spec.weight) / freeWeight,
    );
    const violating = specs
      .map((spec, index) => ({ index, min: spec.minFrames ?? 0 }))
      .filter(({ index, min }) => !pinned.has(index) && (shares[index] ?? 0) < min);
    if (violating.length === 0) {
      break;
    }
    for (const { index } of violating) {
      pinned.add(index);
    }
  }

  // Largest-remainder rounding keeps the exact total.
  const floors = shares.map(Math.floor);
  let remainder = totalFrames - floors.reduce((sum, value) => sum + value, 0);
  const order = shares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) {
      break;
    }
    floors[index] = (floors[index] ?? 0) + 1;
    remainder -= 1;
  }

  let from = 0;
  return specs.map((spec, index) => {
    const durationInFrames = floors[index] ?? 0;
    const segment = { id: spec.id, from, durationInFrames };
    from += durationInFrames;
    return segment;
  });
};

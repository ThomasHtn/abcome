/**
 * Levels squeezed to at most `capacity` bars, each keeping the loudest level of its slice so a
 * narrow screen still shows the peaks; unchanged when they already fit or the room is unknown.
 */
export function fitLevels(levels: readonly number[], capacity: number | null): readonly number[] {
  if (capacity === null || levels.length <= capacity) {
    return levels;
  }
  const count = Math.max(1, capacity);
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor((index * levels.length) / count);
    const end = Math.max(start + 1, Math.floor(((index + 1) * levels.length) / count));
    return Math.max(...levels.slice(start, end));
  });
}

/**
 * How many bars of `barWidth` separated by `gap` fit in `width`, all in pixels.
 */
export function barCapacity(width: number, barWidth: number, gap: number): number {
  return Math.max(1, Math.floor((width + gap) / (barWidth + gap)));
}

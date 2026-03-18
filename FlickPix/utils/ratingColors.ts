export const RATING_COLORS: Record<number, string> = {
  1:  '#EF4444',
  2:  '#F97316',
  3:  '#F59E0B',
  4:  '#EAB308',
  5:  '#84CC16',
  6:  '#22C55E',
  7:  '#10B981',
  8:  '#6366F1',
  9:  '#8B5CF6',
  10: '#A855F7',
};

/** Returns the color for a given rating (1–10). Clamps to valid range. */
export function ratingColor(rating: number): string {
  const clamped = Math.max(1, Math.min(10, Math.round(rating)));
  return RATING_COLORS[clamped] ?? '#8B5CF6';
}

/** Returns a semi-transparent background for a rating chip (hex + '22'). */
export function ratingBg(rating: number): string {
  return `${ratingColor(rating)}22`;
}

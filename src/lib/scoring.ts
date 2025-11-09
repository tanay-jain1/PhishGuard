/**
 * Scoring System for PhishGuard
 * 
 * Handles point calculation and badge awarding based on game performance.
 */

/**
 * Calculate points delta for a guess
 * @param correct - Whether the guess was correct
 * @returns Points delta: +1 if correct, -1 if incorrect (but will be floored at 0 in API)
 */
export function pointsFor(correct: boolean): number {
  return correct ? 1 : -1;
}

/**
 * Calculate which badges a user has earned
 * Badges are cumulative and never removed once earned
 * @param points - Total cumulative points
 * @param streak - Current streak (not used for badges in this version)
 * @param prev - Array of previously earned badge IDs
 * @returns Updated array of badge IDs (deduplicated)
 */
export function nextBadges(
  points: number,
  streak: number,
  prev: string[]
): string[] {
  const set = new Set(prev);

  // Badge thresholds
  if (points >= 10) set.add('Bronze');
  if (points >= 25) set.add('Silver');
  if (points >= 40) set.add('Gold');

  return Array.from(set);
}

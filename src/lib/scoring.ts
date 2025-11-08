/**
 * Scoring System for PhishGuard
 * 
 * Handles point calculation and badge awarding based on game performance.
 */

/**
 * Calculate points earned for a guess
 * @param difficulty - Email difficulty: 1 (easy), 2 (medium), 3 (hard)
 * @param correct - Whether the guess was correct
 * @param newStreak - The new streak count after this guess
 * @returns Points earned (0 if incorrect, difficulty-based if correct, +1 bonus every 5 streak)
 */
export function pointsFor(
  difficulty: 1 | 2 | 3,
  correct: boolean,
  newStreak: number
): number {
  if (!correct) return 0;

  const base = difficulty === 1 ? 1 : difficulty === 2 ? 2 : 3;
  const bonus = newStreak > 0 && newStreak % 5 === 0 ? 1 : 0;

  return base + bonus;
}

/**
 * Calculate which badges a user has earned
 * Badges are cumulative and never removed once earned
 * @param points - Total cumulative points
 * @param streak - Current streak
 * @param prev - Array of previously earned badge IDs
 * @returns Updated array of badge IDs (deduplicated)
 */
export function nextBadges(
  points: number,
  streak: number,
  prev: string[]
): string[] {
  const set = new Set(prev);

  if (points >= 10) set.add('Bronze Rookie');
  if (points >= 25) set.add('Silver Sleuth');
  if (points >= 40) set.add('Gold Guardian');
  if (streak >= 10) set.add('No-Click Ninja');

  return Array.from(set);
}

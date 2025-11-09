/**
 * Badge System for PhishGuard
 * 
 * Pure/deterministic badge computation functions.
 * No database calls - all functions are side-effect free.
 */

export type BadgeRequirementType = 'points' | 'streak' | 'correct_at_level';

export type Badge = {
  id: string;
  name: string;
  icon: string;
  requirementType: BadgeRequirementType;
  threshold: number;
  level?: 1 | 2 | 3;
  description: string;
};

export const BADGES: Badge[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    icon: '🌱',
    requirementType: 'points',
    threshold: 5,
    description: 'Earn 5 points',
  },
  {
    id: 'rising_star',
    name: 'Rising Star',
    icon: '⭐',
    requirementType: 'points',
    threshold: 25,
    description: 'Earn 25 points',
  },
  {
    id: 'eagle_eye',
    name: 'Eagle Eye',
    icon: '🦅',
    requirementType: 'streak',
    threshold: 10,
    description: 'Achieve a 10 streak',
  },
  {
    id: 'medium_master',
    name: 'Medium Master',
    icon: '🎯',
    requirementType: 'correct_at_level',
    threshold: 10,
    level: 2,
    description: 'Get 10 medium questions correct',
  },
  {
    id: 'hard_hawk',
    name: 'Hard Hawk',
    icon: '🦅',
    requirementType: 'correct_at_level',
    threshold: 8,
    level: 3,
    description: 'Get 8 hard questions correct',
  },
];

export interface ProfileSnapshot {
  points: number;
  streak: number;
  easyCorrect?: number;
  mediumCorrect?: number;
  hardCorrect?: number;
}

export interface BadgeProgress {
  earnedIds: string[];
  nextBadge?: {
    id: string;
    percent: number;
    current: number;
    target: number;
  };
}

/**
 * Get badge progress based on profile snapshot
 */
export function getBadgeProgress(
  profile: ProfileSnapshot,
  existingBadges: string[] = []
): BadgeProgress {
  const earnedIds: string[] = [...existingBadges];

  // Check each badge requirement
  for (const badge of BADGES) {
    if (earnedIds.includes(badge.id)) continue;

    let earned = false;
    switch (badge.requirementType) {
      case 'points':
        earned = profile.points >= badge.threshold;
        break;
      case 'streak':
        earned = profile.streak >= badge.threshold;
        break;
      case 'correct_at_level':
        if (badge.level === 1) {
          earned = (profile.easyCorrect || 0) >= badge.threshold;
        } else if (badge.level === 2) {
          earned = (profile.mediumCorrect || 0) >= badge.threshold;
        } else if (badge.level === 3) {
          earned = (profile.hardCorrect || 0) >= badge.threshold;
        }
        break;
    }

    if (earned) {
      earnedIds.push(badge.id);
    }
  }

  // Find next badge
  const nextBadge = BADGES.find((badge) => !earnedIds.includes(badge.id));

  if (!nextBadge) {
    return { earnedIds };
  }

  let current = 0;
  switch (nextBadge.requirementType) {
    case 'points':
      current = profile.points;
      break;
    case 'streak':
      current = profile.streak;
      break;
    case 'correct_at_level':
      if (nextBadge.level === 1) {
        current = profile.easyCorrect || 0;
      } else if (nextBadge.level === 2) {
        current = profile.mediumCorrect || 0;
      } else if (nextBadge.level === 3) {
        current = profile.hardCorrect || 0;
      }
      break;
  }

  const percent = Math.min(100, Math.max(0, (current / nextBadge.threshold) * 100));

  return {
    earnedIds,
    nextBadge: {
      id: nextBadge.id,
      percent,
      current,
      target: nextBadge.threshold,
    },
  };
}

/**
 * Merge existing badges with newly earned ones (dedupe)
 */
export function mergeBadges(
  existingBadges: string[],
  newlyEarnedIds: string[]
): string[] {
  return Array.from(new Set([...existingBadges, ...newlyEarnedIds]));
}

/**
 * Get badge by ID
 */
export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find((badge) => badge.id === id);
}

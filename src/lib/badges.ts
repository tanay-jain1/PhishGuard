/**
 * Badge System for PhishGuard
 * 
 * Badges are awarded based on cumulative points earned.
 * Each badge has a name, description, and point threshold.
 */

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
};

export const BADGES: Badge[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Earned your first 5 points',
    icon: '🌱',
    threshold: 5,
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Reached 25 points',
    icon: '⭐',
    threshold: 25,
  },
  {
    id: 'phish_detector',
    name: 'Phish Detector',
    description: 'Achieved 50 points',
    icon: '🔍',
    threshold: 50,
  },
  {
    id: 'security_expert',
    name: 'Security Expert',
    description: 'Reached 100 points',
    icon: '🛡️',
    threshold: 100,
  },
  {
    id: 'cyber_guardian',
    name: 'Cyber Guardian',
    description: 'Earned 250 points',
    icon: '👑',
    threshold: 250,
  },
  {
    id: 'phishing_master',
    name: 'Phishing Master',
    description: 'Achieved 500 points',
    icon: '🏆',
    threshold: 500,
  },
  {
    id: 'legend',
    name: 'Legend',
    description: 'Reached 1000 points',
    icon: '🌟',
    threshold: 1000,
  },
];

/**
 * Calculate which badges a user has earned based on their points
 */
export function calculateBadges(points: number): string[] {
  return BADGES.filter((badge) => points >= badge.threshold).map((badge) => badge.id);
}

/**
 * Get badge details by ID
 */
export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find((badge) => badge.id === id);
}

/**
 * Get all badges a user has earned
 */
export function getUserBadges(badgeIds: string[]): Badge[] {
  return badgeIds
    .map((id) => getBadgeById(id))
    .filter((badge): badge is Badge => badge !== undefined);
}


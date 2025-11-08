/**
 * Admin access control utilities
 * Simple allowlist-based admin check
 */

/**
 * Check if a user is an admin based on allowlist
 * Supports both user IDs and email addresses
 */
export function isAdmin(userId: string | null, userEmail: string | null): boolean {
  if (!userId && !userEmail) {
    return false;
  }

  // Get admin allowlist from environment variables
  // Format: comma-separated list of user IDs or emails
  // Example: ADMIN_ALLOWLIST="user-id-1,user-id-2,admin@example.com"
  const allowlist = process.env.ADMIN_ALLOWLIST || '';
  
  if (!allowlist.trim()) {
    // If no allowlist is configured, deny all (fail-safe)
    return false;
  }

  const allowed = allowlist
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0) {
    return false;
  }

  const userIdLower = userId?.toLowerCase() || '';
  const userEmailLower = userEmail?.toLowerCase() || '';

  return allowed.some(
    item => item === userIdLower || item === userEmailLower
  );
}


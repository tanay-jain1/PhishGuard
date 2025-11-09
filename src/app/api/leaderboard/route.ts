import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

export interface LeaderboardEntry {
  username: string | null;
  points: number;
  accuracy: number;
  streak: number;
}

interface CachedData {
  entries: LeaderboardEntry[];
  lastUpdated: string;
  etag: string;
  timestamp: number;
}

// In-memory cache with 15-second TTL
let cache: CachedData | null = null;
const CACHE_TTL_MS = 15 * 1000; // 15 seconds

/**
 * Generate stable hash for ETag
 */
function generateETag(entries: LeaderboardEntry[]): string {
  const data = JSON.stringify(entries);
  return createHash('md5').update(data).digest('hex');
}

/**
 * Get leaderboard data (top 10 profiles)
 * GET /api/leaderboard
 * Ordered by: points DESC, accuracy DESC, created_at ASC
 * Cached for 15 seconds
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check cache
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_TTL_MS) {
      const response = NextResponse.json({
        entries: cache.entries,
        lastUpdated: cache.lastUpdated,
      });
      response.headers.set('ETag', `"${cache.etag}"`);
      return response;
    }

    // Fetch top 10 profiles with deterministic ordering
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, points, streak, accuracy, created_at')
      .order('points', { ascending: false })
      .order('accuracy', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Failed to fetch leaderboard:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard', details: error.message },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      const emptyData = { entries: [], lastUpdated: new Date().toISOString() };
      const response = NextResponse.json(emptyData);
      response.headers.set('ETag', '"empty"');
      return response;
    }

    // Validate tie-breaking: ensure proper ordering
    // This is a sanity check - Supabase should handle this, but we verify
    for (let i = 0; i < profiles.length - 1; i++) {
      const current = profiles[i];
      const next = profiles[i + 1];
      
      if (current.points === next.points && current.accuracy === next.accuracy) {
        const currentDate = new Date(current.created_at || 0).getTime();
        const nextDate = new Date(next.created_at || 0).getTime();
        if (currentDate > nextDate) {
          console.warn('Tie-breaking validation: earlier created_at should come first');
        }
      }
    }

    // Map profiles to leaderboard entries with username fallback
    const leaderboardEntries: LeaderboardEntry[] = profiles.map((profile) => ({
      username: profile.username && profile.username.trim().length > 0
        ? profile.username
        : profile.id.substring(0, 8), // Fallback to short user id
      points: profile.points || 0,
      accuracy: profile.accuracy || 0,
      streak: profile.streak || 0,
    }));

    // Generate ETag and cache
    const etag = generateETag(leaderboardEntries);
    const lastUpdated = new Date().toISOString();
    
    cache = {
      entries: leaderboardEntries,
      lastUpdated,
      etag,
      timestamp: now,
    };

    const response = NextResponse.json({
      entries: leaderboardEntries,
      lastUpdated,
    });
    response.headers.set('ETag', `"${etag}"`);
    
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

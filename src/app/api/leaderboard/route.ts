import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface LeaderboardEntry {
  userId: string;
  username: string | null;
  points: number;
  streak: number;
  accuracy: number;
  created_at?: string;
}

/**
 * Get leaderboard data (top 20 profiles)
 * GET /api/leaderboard
 * Returns fresh data from server (no caching)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch profiles (we'll sort in JavaScript for multi-column sorting)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, points, streak, accuracy, created_at')
      .order('points', { ascending: false })
      .limit(50); // Fetch more to ensure we get top 20 after sorting

    if (error) {
      console.error('Failed to fetch leaderboard:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard', details: error.message },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ entries: [] });
    }

    // Map profiles to leaderboard entries
    const leaderboardEntries: LeaderboardEntry[] = profiles.map((profile) => ({
      userId: profile.id,
      username: profile.username,
      points: profile.points || 0,
      streak: profile.streak || 0,
      accuracy: profile.accuracy || 0,
      created_at: profile.created_at,
    }));

    // Sort by points DESC, accuracy DESC, created_at ASC
    leaderboardEntries.sort((a, b) => {
      // First by points (descending)
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      // Then by accuracy (descending)
      const aAccuracy = a.accuracy || 0;
      const bAccuracy = b.accuracy || 0;
      if (bAccuracy !== aAccuracy) {
        return bAccuracy - aAccuracy;
      }
      // Finally by created_at (ascending - earlier is better)
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();
      return aDate - bDate;
    });

    // Take top 20
    const top20 = leaderboardEntries.slice(0, 20);

    return NextResponse.json({ entries: top20 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

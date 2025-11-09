import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getBadgeProgress } from '@/lib/badges';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Read userId from Authorization Bearer header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '').trim();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid userId' },
        { status: 401 }
      );
    }

    // Fetch profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, streak, accuracy, badges, username')
      .eq('id', userId)
      .single();

    if (profileError) {
      // Profile doesn't exist - return defaults
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          profile: {
            points: 0,
            streak: 0,
            accuracy: 0,
            badges: [],
            username: null,
          },
          nextBadge: null,
        });
      }

      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Get current badges (handle both text[] and JSONB formats)
    const badges = Array.isArray(profile.badges)
      ? (profile.badges as string[])
      : profile.badges
      ? (typeof profile.badges === 'string' ? JSON.parse(profile.badges) : profile.badges)
      : [];

    // Get user stats for badge computation
    const { data: statsData } = await supabase.rpc('get_user_stats', {
      p_user_id: userId,
    });

    const stats = statsData?.[0] || {};

    // Compute badge progress
    const badgeProgress = getBadgeProgress(
      {
        points: profile.points || 0,
        streak: profile.streak || 0,
        easyCorrect: stats.easy_correct || 0,
        mediumCorrect: stats.medium_correct || 0,
        hardCorrect: stats.hard_correct || 0,
      },
      badges
    );

    // Build response
    const response = {
      profile: {
        points: profile.points || 0,
        streak: profile.streak || 0,
        accuracy: profile.accuracy || 0,
        badges: badgeProgress.earnedIds,
        username: profile.username || null,
      },
      nextBadge: badgeProgress.nextBadge
        ? {
            id: badgeProgress.nextBadge.id,
            name: badgeProgress.nextBadge.id, // Client will resolve name from BADGES
            pointsRequired: badgeProgress.nextBadge.target,
            percent: badgeProgress.nextBadge.percent,
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Profile overview API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}


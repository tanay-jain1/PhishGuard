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

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, streak, accuracy, badges')
      .eq('id', userId)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          points: 0,
          streak: 0,
          accuracy: 0,
          totalGuesses: 0,
          badges: [],
          nextBadge: null,
          perLevel: {
            easyCorrect: 0,
            mediumCorrect: 0,
            hardCorrect: 0,
          },
        });
      }

      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Get user stats
    const { data: statsData, error: statsError } = await supabase.rpc('get_user_stats', {
      p_user_id: userId,
    });

    const stats = statsData?.[0] || {};

    // Get current badges
    const currentBadges = Array.isArray(profile.badges)
      ? (profile.badges as string[])
      : profile.badges
      ? (typeof profile.badges === 'string' ? JSON.parse(profile.badges) : profile.badges)
      : [];

    // Compute badge progress
    const badgeProgress = getBadgeProgress(
      {
        points: profile.points || 0,
        streak: profile.streak || 0,
        easyCorrect: stats.easy_correct || 0,
        mediumCorrect: stats.medium_correct || 0,
        hardCorrect: stats.hard_correct || 0,
      },
      currentBadges
    );

    // Get total guesses
    const { count: totalGuesses } = await supabase
      .from('guesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return NextResponse.json({
      points: profile.points || 0,
      streak: profile.streak || 0,
      accuracy: profile.accuracy || 0,
      totalGuesses: totalGuesses || 0,
      badges: badgeProgress.earnedIds,
      nextBadge: badgeProgress.nextBadge || null,
      perLevel: {
        easyCorrect: stats.easy_correct || 0,
        mediumCorrect: stats.medium_correct || 0,
        hardCorrect: stats.hard_correct || 0,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Profile summary API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}


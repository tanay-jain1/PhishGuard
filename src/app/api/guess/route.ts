import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getBadgeProgress, mergeBadges } from '@/lib/badges';

export async function POST(request: Request) {
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { emailId, guessIsPhish } = body;

    if (!emailId || typeof guessIsPhish !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing emailId or guessIsPhish' },
        { status: 400 }
      );
    }

    // Load email row to get explanation, features, and actual answer
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('id, explanation, features, difficulty, is_phish')
      .eq('id', emailId)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { error: 'Email not found', details: emailError?.message },
        { status: 404 }
      );
    }

    // Call apply_guess RPC function
    const { data: rpcResult, error: rpcError } = await supabase.rpc('apply_guess', {
      p_user: userId,
      p_email: emailId,
      p_guess: guessIsPhish,
    });

    // Handle RPC errors
    if (rpcError) {
      console.error('RPC error details:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        userId,
        emailId,
        guessIsPhish,
      });

      // Check for unique violation (already_guessed)
      if (rpcError.code === '23505' || rpcError.message?.includes('already_guessed')) {
        return NextResponse.json(
          { error: 'already_guessed' },
          { status: 409 }
        );
      }

      // Check for email not found
      if (rpcError.code === 'P0001' || rpcError.message?.includes('Email not found')) {
        return NextResponse.json(
          { error: 'Email not found', details: rpcError.message },
          { status: 404 }
        );
      }

      // Check if function doesn't exist
      if (rpcError.code === '42883' || rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
        console.error('ERROR: apply_guess function does not exist in database. Please run migration-apply-guess.sql in Supabase SQL editor.');
        return NextResponse.json(
          { 
            error: 'Database function not found', 
          details: 'The apply_guess function needs to be created in your database. Please run the migration SQL file.',
            hint: 'Run migration-apply-guess.sql in Supabase SQL editor'
          },
          { status: 500 }
        );
      }

      // Other errors
      return NextResponse.json(
        { 
          error: 'Internal server error', 
          details: rpcError.message,
          code: rpcError.code,
        },
        { status: 500 }
      );
    }

    if (!rpcResult) {
      return NextResponse.json(
        { error: 'No result from RPC' },
        { status: 500 }
      );
    }

    // Get updated points and streak from RPC result
    const newPoints = rpcResult.profile?.points ?? 0;
    const newStreak = rpcResult.profile?.streak ?? 0;

    // Get user stats for badge computation
    const { data: statsData, error: statsError } = await supabase.rpc('get_user_stats', {
      p_user_id: userId,
    });

    // Fetch current profile to get existing badges
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('badges')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json({
        correct: rpcResult.correct,
        pointsDelta: rpcResult.pointsDelta,
        profile: {
          points: newPoints,
          streak: newStreak,
          accuracy: rpcResult.profile?.accuracy ?? 0,
          badges: [],
        },
        unlockedBadges: [],
        explanation: email.explanation || '',
        featureFlags: (email.features as string[]) || [],
        difficulty: rpcResult.difficulty || email.difficulty,
        isPhish: email.is_phish, // Include actual answer even in error case
      });
    }

    // Get current badges (handle JSONB format)
    const currentBadges = Array.isArray(profile.badges)
      ? (profile.badges as string[])
      : profile.badges
      ? (typeof profile.badges === 'string' ? JSON.parse(profile.badges) : profile.badges)
      : [];

    // Compute badge progress
    const stats = statsData?.[0] || {};
    const badgeProgress = getBadgeProgress(
      {
        points: newPoints,
        streak: newStreak,
        easyCorrect: stats.easy_correct || 0,
        mediumCorrect: stats.medium_correct || 0,
        hardCorrect: stats.hard_correct || 0,
      },
      currentBadges
    );

    // Find newly unlocked badges
    const newlyUnlocked = badgeProgress.earnedIds.filter((id) => !currentBadges.includes(id));

    // Update badges in database if there are new ones
    if (newlyUnlocked.length > 0) {
      const mergedBadges = mergeBadges(currentBadges, newlyUnlocked);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ badges: mergedBadges })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update badges:', updateError);
        // Continue anyway - badges will be updated on next request
      }
    }

    // Build response
    const response: {
      correct: boolean;
      pointsDelta: number;
      profile: {
        points: number;
        streak: number;
        accuracy: number;
        badges: string[];
      };
      unlockedBadges?: string[];
      nextBadge?: {
        id: string;
        percent: number;
        current: number;
        target: number;
      };
      explanation?: string;
      featureFlags?: string[];
      difficulty?: string;
      isPhish?: boolean; // Actual answer from database
    } = {
      correct: rpcResult.correct,
      pointsDelta: rpcResult.pointsDelta,
      profile: {
        points: newPoints,
        streak: newStreak,
        accuracy: rpcResult.profile?.accuracy ?? 0,
        badges: badgeProgress.earnedIds,
      },
      explanation: email.explanation || '',
      featureFlags: (email.features as string[]) || [],
      difficulty: rpcResult.difficulty || email.difficulty,
      isPhish: email.is_phish, // Include actual answer
    };

    // Add unlocked badges if any
    if (newlyUnlocked.length > 0) {
      response.unlockedBadges = newlyUnlocked;
    }

    // Add next badge progress if available
    if (badgeProgress.nextBadge) {
      response.nextBadge = badgeProgress.nextBadge;
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Guess API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

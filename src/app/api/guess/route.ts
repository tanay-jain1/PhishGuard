import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { pointsFor, nextBadges } from '@/lib/scoring';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user from session (preferred for RLS)
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    // IMPORTANT: For RLS to work, we MUST use the session-based authUser
    let userId: string | null = null;
    if (authUser) {
      userId = authUser.id;
    } else {
      // Fallback to Authorization header
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        userId = authHeader.replace('Bearer ', '').trim();
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - no user session or authorization header' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { emailId, guessIsPhish } = body;

    if (!emailId || typeof guessIsPhish !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing emailId or guessIsPhish' },
        { status: 400 }
      );
    }

    // 1. Load the email row by id
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('id, is_phish, explanation, features, difficulty')
      .eq('id', emailId)
      .single();

    if (emailError || !email) {
      return NextResponse.json(
        { error: 'Email not found', details: emailError?.message },
        { status: 404 }
      );
    }

    // 2. Check if user already guessed this email (prevent duplicates)
    const { data: existingGuess } = await supabase
      .from('guesses')
      .select('id')
      .eq('user_id', userId)
      .eq('email_id', emailId)
      .single();

    if (existingGuess) {
      return NextResponse.json(
        { error: 'already_guessed' },
        { status: 409 }
      );
    }

    // 3. Set correct = (guessIsPhish === is_phish)
    const correct = email.is_phish === guessIsPhish;

    // 4. Read user profile (points, streak, badges) - MUST read current state before updating
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, streak, badges, email, username')
      .eq('id', userId)
      .single();

    // If profile doesn't exist, create it with defaults
    if (profileError && profileError.code === 'PGRST116') {
      const userEmail = authUser?.email || '';
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            points: 0,
            streak: 0,
            badges: [],
            email: userEmail,
            username: null,
          },
          {
            onConflict: 'id',
          }
        )
        .select('points, streak, badges')
        .single();

      if (createError) {
        profile = { points: 0, streak: 0, badges: [] };
      } else {
        profile = newProfile;
      }
    } else if (profileError) {
      // Other error - use defaults
      profile = { points: 0, streak: 0, badges: [] };
    }

    const currentPoints = typeof profile?.points === 'number' ? profile.points : 0;
    const currentStreak = typeof profile?.streak === 'number' ? profile.streak : 0;
    const currentBadges = (profile?.badges as string[]) || [];

    // 5. Compute newStreak: if correct then streak+1 else 0
    const newStreak = correct ? currentStreak + 1 : 0;

    // 6. Convert difficulty from text to number (easy=1, medium=2, hard=3)
    let difficultyNum: 1 | 2 | 3 = 1;
    if (email.difficulty === 'medium') {
      difficultyNum = 2;
    } else if (email.difficulty === 'hard') {
      difficultyNum = 3;
    }

    // 7. Compute pointsDelta = pointsFor(difficulty, correct, newStreak)
    // IMPORTANT: newStreak is used here so streak bonus applies in the same transaction
    const pointsDelta = pointsFor(difficultyNum, correct, newStreak);

    // 8. Update cumulative points = points + pointsDelta (DO NOT reset on incorrect)
    // Points are ALWAYS cumulative - never reset, never decrease
    const newPoints = currentPoints + pointsDelta;

    // 9. Insert guess row FIRST (before profile update to ensure accuracy calculation includes this guess)
    const { error: guessError } = await supabase
      .from('guesses')
      .insert({
        user_id: userId,
        email_id: emailId,
        user_guess: guessIsPhish,
        is_correct: correct,
        points: pointsDelta,
      });

    if (guessError) {
      // Check if it's a duplicate key error
      if (guessError.code === '23505') {
        return NextResponse.json(
          { error: 'already_guessed' },
          { status: 409 }
        );
      }
      console.warn('Failed to insert guess:', guessError.message);
      // Continue anyway - we'll still update profile
    }

    // 10. Recompute accuracy = correct_count / total_count from guesses table
    // This MUST be done after inserting the guess to get accurate counts
    const { count: totalGuesses } = await supabase
      .from('guesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: correctGuesses } = await supabase
      .from('guesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_correct', true);

    const totalGuessesCount = totalGuesses || 0;
    const correctGuessesCount = correctGuesses || 0;
    const accuracy = totalGuessesCount > 0 ? correctGuessesCount / totalGuessesCount : 0;

    // 11. Compute updated badges = nextBadges(points, streak, currentBadges)
    const updatedBadges = nextBadges(newPoints, newStreak, currentBadges);

    // 12. Update profile in ONE statement: points, streak, badges
    // Use upsert with onConflict to ensure atomic update (no race conditions)
    // This is the single source of truth update
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          points: newPoints, // Cumulative points (never reset, never decrease)
          streak: newStreak, // Reset to 0 on incorrect, increment on correct
          badges: updatedBadges, // Updated badge array
          email: authUser?.email || profile?.email || '',
          username: profile?.username || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      )
      .select('points, streak, badges')
      .single();

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      // Return calculated values even if update fails
      return NextResponse.json({
        correct,
        pointsDelta,
        profileSnapshot: {
          points: newPoints,
          streak: newStreak,
          accuracy: Math.round(accuracy * 10000) / 100, // As percentage (0-100)
          badges: updatedBadges,
        },
        difficulty: email.difficulty,
        explanation: email.explanation,
        featureFlags: (email.features as string[]) || [],
      });
    }

    // 13. Return single source of truth snapshot from database
    // Use the actual values from the database (updatedProfile) as the source of truth
    // Accuracy is computed from guesses table, not stored in profile
    return NextResponse.json({
      correct,
      pointsDelta,
      profileSnapshot: {
        points: updatedProfile?.points ?? newPoints,
        streak: updatedProfile?.streak ?? newStreak,
        accuracy: Math.round(accuracy * 10000) / 100, // As percentage (0-100), rounded to 2 decimals
        badges: (updatedProfile?.badges as string[]) ?? updatedBadges,
      },
      difficulty: email.difficulty,
      explanation: email.explanation,
      featureFlags: (email.features as string[]) || [],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

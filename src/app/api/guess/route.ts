import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Get userId from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { emailId, guess } = body;

    if (!emailId || typeof guess !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing emailId or guess' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the email to check if it's phishing
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

    // Compute if guess is correct
    const correct = email.is_phish === guess;

    // Get user's current profile to check streak
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, streak')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    const currentPoints = profile?.points || 0;
    const currentStreak = profile?.streak || 0;

    // Calculate points: +1 base, +1 bonus every 5 streak
    let pointsDelta = 0;
    let newStreak = 0;

    if (correct) {
      pointsDelta = 1;
      newStreak = currentStreak + 1;
      // Bonus point every 5 streak
      if (newStreak % 5 === 0) {
        pointsDelta += 1;
      }
    } else {
      // Reset streak on incorrect guess
      newStreak = 0;
    }

    const newPoints = currentPoints + pointsDelta;

    // Upsert guess record
    const { error: guessError } = await supabase.from('guesses').upsert(
      {
        user_id: userId,
        email_id: emailId,
        user_guess: guess,
        is_correct: correct,
        points: pointsDelta,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,email_id',
      }
    );

    if (guessError) {
      // If guesses table doesn't exist, that's okay - we'll continue
      console.warn('Failed to upsert guess:', guessError.message);
    }

    // Update profile with new points and streak
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          points: newPoints,
          streak: newStreak,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

    if (updateError) {
      return NextResponse.json(
        {
          error: 'Failed to update profile',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // Return response
    return NextResponse.json({
      correct,
      pointsDelta,
      explanation: email.explanation,
      featureFlags: email.features || [],
      difficulty: email.difficulty,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}


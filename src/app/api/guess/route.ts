import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Load email row to get explanation and features
    const { data: email, error: emailError } = await supabase
      .from('emails')
      .select('id, explanation, features, difficulty')
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

    // The RPC function now returns profile data directly, so use it
    // If profile is in the RPC result, use it; otherwise fetch separately
    if (rpcResult.profile) {
      console.log('Profile from RPC:', rpcResult.profile);
      return NextResponse.json({
        correct: rpcResult.correct,
        pointsDelta: rpcResult.pointsDelta,
        profile: {
          points: rpcResult.profile.points ?? 0,
          streak: rpcResult.profile.streak ?? 0,
          accuracy: rpcResult.profile.accuracy ?? 0,
          badges: (rpcResult.profile.badges as string[]) || [],
        },
        unlockedBadges: rpcResult.unlockedBadges || [],
        explanation: email.explanation || '',
        featureFlags: (email.features as string[]) || [],
        difficulty: rpcResult.difficulty || email.difficulty,
      });
    }

    // Fallback: fetch profile if RPC didn't return it (for backward compatibility)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, streak, accuracy, badges')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json({
        correct: rpcResult.correct,
        pointsDelta: rpcResult.pointsDelta,
        profile: {
          points: 0,
          streak: 0,
          accuracy: 0,
          badges: [],
        },
        unlockedBadges: rpcResult.unlockedBadges || [],
        explanation: email.explanation || '',
        featureFlags: (email.features as string[]) || [],
        difficulty: rpcResult.difficulty || email.difficulty,
      });
    }

    console.log('Profile fetched from DB:', profile);
    return NextResponse.json({
      correct: rpcResult.correct,
      pointsDelta: rpcResult.pointsDelta,
      profile: {
        points: profile.points ?? 0,
        streak: profile.streak ?? 0,
        accuracy: profile.accuracy ?? 0,
        badges: (profile.badges as string[]) || [],
      },
      unlockedBadges: rpcResult.unlockedBadges || [],
      explanation: email.explanation || '',
      featureFlags: (email.features as string[]) || [],
      difficulty: rpcResult.difficulty || email.difficulty,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Guess API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

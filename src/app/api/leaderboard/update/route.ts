import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for username and current points
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, points')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';
    const currentPoints = profile?.points || 0;

    // Get current leaderboard entry
    const { data: currentEntry, error: entryError } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (entryError && entryError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard entry', details: entryError.message },
        { status: 500 }
      );
    }

    // Count total guesses for total_games
    const { count: totalGuesses, error: guessesError } = await supabase
      .from('guesses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (guessesError) {
      return NextResponse.json(
        { error: 'Failed to count guesses', details: guessesError.message },
        { status: 500 }
      );
    }

    const newHighScore = currentEntry
      ? Math.max(currentEntry.high_score || 0, currentPoints)
      : currentPoints;

    const { data, error } = await supabase
      .from('leaderboard')
      .upsert({
        user_id: user.id,
        username,
        high_score: newHighScore,
        total_games: totalGuesses || 0,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update leaderboard', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ leaderboard: data });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}


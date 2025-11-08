import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user profile for username and current points
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, points')
    .eq('id', user.id)
    .single();

  const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';
  const currentPoints = profile?.points || 0;

  // Get current leaderboard entry
  const { data: currentEntry } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // Count total guesses for total_games
  const { count: totalGuesses } = await supabase
    .from('guesses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leaderboard: data });
}


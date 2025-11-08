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

  const body = await request.json();
  const { score } = body;

  // Get user profile for username
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';

  // Get current leaderboard entry
  const { data: currentEntry } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const newHighScore = currentEntry
    ? Math.max(currentEntry.high_score || 0, score)
    : score;

  const { data, error } = await supabase
    .from('leaderboard')
    .upsert({
      user_id: user.id,
      username,
      high_score: newHighScore,
      total_games: currentEntry ? (currentEntry.total_games || 0) + 1 : 1,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leaderboard: data });
}


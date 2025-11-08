import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get all profiles with their guess statistics
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, points, created_at')
      .order('created_at', { ascending: true });

    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles', details: profilesError.message },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ entries: [] });
    }

    // Calculate accuracy for each user
    const leaderboardEntries = await Promise.all(
      profiles.map(async (profile) => {
        const { count: totalGuesses } = await supabase
          .from('guesses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);

        const { count: correctGuesses } = await supabase
          .from('guesses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_correct', true);

        const total = totalGuesses || 0;
        const correct = correctGuesses || 0;
        const accuracy = total > 0 ? (correct / total) * 100 : 0;

        return {
          userId: profile.id,
          username: profile.username || 'Anonymous',
          points: profile.points || 0,
          accuracy: Math.round(accuracy * 100) / 100,
          totalGuesses: total,
          correctGuesses: correct,
          created_at: profile.created_at,
        };
      })
    );

    // Sort: points desc, accuracy desc, created_at asc
    leaderboardEntries.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    // Return top 10
    const top10 = leaderboardEntries.slice(0, 10);

    return NextResponse.json({ entries: top10 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}


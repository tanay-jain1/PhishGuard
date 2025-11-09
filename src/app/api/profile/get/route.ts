import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Get current user's profile
 * GET /api/profile/get
 * Auth: Bearer <userId> in Authorization header
 */
export async function GET(request: Request) {
  try {
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

    const supabase = await createClient();

    // Fetch profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, streak, accuracy, badges, username, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      // Profile doesn't exist - return defaults
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({
          points: 0,
          streak: 0,
          accuracy: 0,
          badges: [],
          username: null,
          email: null,
        });
      }

      console.error('Failed to fetch profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    // Return profile data
    return NextResponse.json({
      points: profile.points || 0,
      streak: profile.streak || 0,
      accuracy: profile.accuracy || 0,
      badges: (profile.badges as string[]) || [],
      username: profile.username || null,
      email: profile.email || null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Profile GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}


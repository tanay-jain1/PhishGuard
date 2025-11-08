import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Initialize or update user profile
 * This endpoint ensures the user has a profile in the database
 * Upserts profile with id=userId (no changes if it already exists)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get user's email from auth
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    // Upsert profile with default values and user's email
    // onConflict: 'id' ensures no duplicate is created if profile already exists
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          points: 0,
          streak: 0,
          badges: [],
          email: authUser?.email || '',
          username: null,
        },
        {
          onConflict: 'id',
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to initialize profile', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

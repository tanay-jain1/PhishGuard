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

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // If profile exists, return it without modifying
    if (existingProfile && !checkError) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return NextResponse.json({ profile, alreadyExists: true });
    }

    // Profile doesn't exist - create it with default values
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: authUser?.email || '',
        points: 0,
        streak: 0,
        badges: [],
        accuracy: 0,
        username: '',
      })
      .select()
      .single();

    if (error) {
      // If it's a unique constraint error, profile was created between check and insert
      if (error.code === '23505') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        return NextResponse.json({ profile, alreadyExists: true });
      }
      return NextResponse.json(
        { error: 'Failed to initialize profile', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: data, alreadyExists: false });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

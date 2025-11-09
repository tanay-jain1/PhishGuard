import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Update user profile (username, etc.)
 * POST /api/profile/update
 * Auth: Bearer <userId> in Authorization header
 * Body: { username?: string }
 */
export async function POST(request: Request) {
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
    const { username } = body;

    // Validate username if provided
    if (username !== undefined) {
      if (typeof username !== 'string') {
        return NextResponse.json(
          { error: 'Username must be a string' },
          { status: 400 }
        );
      }

      // Trim and validate username
      const trimmedUsername = username.trim();
      
      if (trimmedUsername.length === 0) {
        return NextResponse.json(
          { error: 'Username cannot be empty' },
          { status: 400 }
        );
      }

      if (trimmedUsername.length > 50) {
        return NextResponse.json(
          { error: 'Username must be 50 characters or less' },
          { status: 400 }
        );
      }

      // Check if username is already taken by another user
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmedUsername)
        .neq('id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows found (good, username is available)
        console.error('Error checking username:', checkError);
      }

      if (existingProfile) {
        return NextResponse.json(
          { 
            error: 'Username already taken',
            message: 'This username is already in use. Please choose a different username.'
          },
          { status: 409 }
        );
      }

      // Update profile with new username
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          username: trimmedUsername,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('username')
        .single();

      if (updateError) {
        console.error('Failed to update profile:', updateError);
        return NextResponse.json(
          { error: 'Failed to update profile', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        profile: {
          username: updatedProfile?.username,
        },
      });
    }

    // No username provided
    return NextResponse.json(
      { error: 'No fields to update' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}


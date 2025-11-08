import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Upsert profile with just the id
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
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


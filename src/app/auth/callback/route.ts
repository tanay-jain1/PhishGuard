import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/about';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Get the user to initialize profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Initialize profile after successful login
        try {
          await fetch(`${requestUrl.origin}/api/auth/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
        } catch (initError) {
          console.error('Failed to init profile:', initError);
          // Continue anyway - profile will be created on play page
        }
      }

      // Redirect to the next page (usually /play)
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // If there's an error or no code, redirect to auth page
  return NextResponse.redirect(new URL('/auth', requestUrl.origin));
}


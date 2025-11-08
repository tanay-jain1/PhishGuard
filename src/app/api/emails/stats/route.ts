/**
 * Email statistics endpoint
 * 
 * GET /api/emails/stats
 * 
 * Returns aggregate statistics about emails in the database:
 * - Counts per difficulty (easy, medium, hard)
 * - Total phishing vs legitimate emails
 * - Total emails in table
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Create service role client for database operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error - service role key not configured' },
        { status: 500 }
      );
    }

    const serviceSupabase = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get total count
    const { count: totalCount, error: totalError } = await serviceSupabase
      .from('emails')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw totalError;
    }

    // Get counts by difficulty
    const { count: easyCount, error: easyError } = await serviceSupabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', 'easy');

    if (easyError) {
      throw easyError;
    }

    const { count: mediumCount, error: mediumError } = await serviceSupabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', 'medium');

    if (mediumError) {
      throw mediumError;
    }

    const { count: hardCount, error: hardError } = await serviceSupabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', 'hard');

    if (hardError) {
      throw hardError;
    }

    // Get phishing vs legitimate counts
    const { count: phishCount, error: phishError } = await serviceSupabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('is_phish', true);

    if (phishError) {
      throw phishError;
    }

    const { count: legitCount, error: legitError } = await serviceSupabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .eq('is_phish', false);

    if (legitError) {
      throw legitError;
    }

    return NextResponse.json({
      total: totalCount || 0,
      difficulty: {
        easy: easyCount || 0,
        medium: mediumCount || 0,
        hard: hardCount || 0,
      },
      phish: {
        phishing: phishCount || 0,
        legitimate: legitCount || 0,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Stats API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}


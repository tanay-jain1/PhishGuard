/**
 * Admin-only email generation endpoint
 * 
 * POST /api/admin/generate-emails
 * 
 * Body: { count?: number } (default: 10, clamped to 1-20)
 * 
 * Generates emails using Bedrock, validates, normalizes, deduplicates, and upserts to database.
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { generateEmails } from '@/lib/llm/bedrock';
import { GeneratedEmailSchema, normalizeAndScore } from '@/lib/generationSchema';

/**
 * Hardcoded admin user IDs (fallback if env var not set)
 */
const HARDCODED_ADMIN_IDS: string[] = [
  // Add hardcoded user IDs here if needed
];

/**
 * Check if user is admin
 */
function isAdminUser(userId: string | null, userEmail: string | null): boolean {
  if (!userId && !userEmail) {
    return false;
  }

  // Check hardcoded user IDs
  if (userId && HARDCODED_ADMIN_IDS.includes(userId)) {
    return true;
  }

  // Check ADMIN_EMAILS env var
  const adminEmails = process.env.ADMIN_EMAILS || '';
  if (!adminEmails.trim()) {
    return false;
  }

  const allowedEmails = adminEmails
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return false;
  }

  const userEmailLower = userEmail?.toLowerCase() || '';
  return allowedEmails.includes(userEmailLower);
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized - authentication required' },
        { status: 401 }
      );
    }

    // 2. Check admin access
    if (!isAdminUser(authUser.id, authUser.email || null)) {
      return NextResponse.json(
        { error: 'Forbidden - admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json().catch(() => ({}));
    const requestedCount = typeof body.count === 'number' ? body.count : 10;
    
    // Handle count: 0 as a test/auth check (return early without generating)
    if (requestedCount === 0) {
      return NextResponse.json({
        inserted: 0,
        skipped: 0,
        message: 'Auth check successful',
      });
    }
    
    const count = Math.min(Math.max(1, Math.floor(requestedCount)), 20);

    // 4. Generate emails using bedrock
    let items: Awaited<ReturnType<typeof generateEmails>> = [];
    try {
      items = await generateEmails(count);
    } catch (error) {
      console.error('Email generation failed:', error);
      return NextResponse.json(
        { 
          error: 'Email generation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No emails generated' },
        { status: 500 }
      );
    }

    // 5. Validate and normalize each email
    const validatedEmails: Array<ReturnType<typeof normalizeAndScore>> = [];
    const validationErrors: string[] = [];

    for (const item of items) {
      try {
        // Validate with schema
        const validated = GeneratedEmailSchema.parse(item);
        // Normalize and score
        const normalized = normalizeAndScore(validated);
        validatedEmails.push(normalized);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
        validationErrors.push(errorMsg);
        console.warn('Email validation failed:', errorMsg, item);
      }
    }

    if (validatedEmails.length === 0) {
      return NextResponse.json(
        { error: 'No valid emails after validation', details: validationErrors },
        { status: 500 }
      );
    }

    // 6. Create service role client for database operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Server configuration error - NEXT_PUBLIC_SUPABASE_URL not configured' },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      return NextResponse.json(
        { 
          error: 'Server configuration error - SUPABASE_SERVICE_ROLE_KEY not configured',
          hint: 'Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file. Get it from Supabase Dashboard > Settings > API > service_role key'
        },
        { status: 500 }
      );
    }

    const serviceSupabase = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 7. Deduplicate: Check existing emails by subject + from_email
    const emailKeys = validatedEmails.map(e => ({
      from_email: e.from_email,
      subject: e.subject,
    }));

    const existingSet = new Set<string>();
    const uniqueFromEmails = [...new Set(emailKeys.map(k => k.from_email))];

    for (const fromEmail of uniqueFromEmails) {
      const { data } = await serviceSupabase
        .from('emails')
        .select('from_email, subject')
        .eq('from_email', fromEmail)
        .in('subject', emailKeys.filter(k => k.from_email === fromEmail).map(k => k.subject));

      if (data) {
        for (const existing of data) {
          existingSet.add(`${existing.from_email}::${existing.subject}`);
        }
      }
    }

    // Filter out duplicates
    const newEmails = validatedEmails.filter(
      email => !existingSet.has(`${email.from_email}::${email.subject}`)
    );

    if (newEmails.length === 0) {
      return NextResponse.json({
        inserted: 0,
        skipped: validatedEmails.length,
      });
    }

    // 8. Prepare emails for insert (convert difficulty from 1|2|3 to 'easy'|'medium'|'hard')
    const difficultyMap: Record<1 | 2 | 3, 'easy' | 'medium' | 'hard'> = {
      1: 'easy',
      2: 'medium',
      3: 'hard',
    };

    const emailsToInsert = newEmails.map(email => ({
      subject: email.subject,
      from_name: email.from_name,
      from_email: email.from_email,
      body_html: email.body_html,
      is_phish: email.is_phish,
      features: email.features,
      explanation: email.explanation,
      difficulty: difficultyMap[email.difficulty],
      updated_at: new Date().toISOString(),
    }));

    // 9. Insert emails
    const { data: insertedData, error: insertError } = await serviceSupabase
      .from('emails')
      .insert(emailsToInsert)
      .select('id');

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to insert emails into database',
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    const inserted = insertedData?.length || 0;
    const skipped = validatedEmails.length - newEmails.length;

    return NextResponse.json({
      inserted,
      skipped,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email generation API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}


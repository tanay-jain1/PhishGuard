/**
 * Public auto-generation endpoint
 * 
 * POST /api/emails/auto-generate
 * 
 * Automatically generates emails when pool is low/empty.
 * This endpoint is public (any authenticated user can trigger it).
 * No admin access required - designed for seamless gameplay.
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { generateEmails } from '@/lib/llm/bedrock';
import { GeneratedEmailSchema, normalizeAndScore } from '@/lib/generationSchema';

export async function POST(request: Request) {
  try {
    // 1. Authenticate user (any authenticated user can trigger this)
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

    // 2. Parse request body
    const body = await request.json().catch(() => ({}));
    const requestedCount = typeof body.count === 'number' ? body.count : 20;
    const count = Math.min(Math.max(1, Math.floor(requestedCount)), 20);

    // 3. Check if service role key is available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { 
          error: 'Server configuration error - service role key not configured',
          hint: 'Add SUPABASE_SERVICE_ROLE_KEY to .env.local'
        },
        { status: 500 }
      );
    }

    // 4. Generate emails using bedrock (or mock)
    console.log(`📧 Starting email generation for ${count} emails...`);
    let items: Awaited<ReturnType<typeof generateEmails>> = [];
    try {
      items = await generateEmails(count);
      console.log(`✅ Email generation completed: ${items?.length || 0} emails generated`);
    } catch (error) {
      console.error('❌ Email generation failed:', error);
      return NextResponse.json(
        { 
          error: 'Email generation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('❌ No emails generated - items is empty or not an array');
      return NextResponse.json(
        { error: 'No emails generated', details: 'Generation returned empty result' },
        { status: 500 }
      );
    }
    
    console.log(`📝 Processing ${items.length} generated emails...`);

    // 5. Validate and normalize
    const validatedEmails: Array<ReturnType<typeof normalizeAndScore>> = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        console.log(`📝 Validating email ${i + 1}/${items.length}:`, {
          subject: item.subject?.substring(0, 50),
          hasFeatures: !!item.features,
          hasDifficulty: !!item.difficulty,
        });
        
        const validated = GeneratedEmailSchema.parse(item);
        const normalized = normalizeAndScore(validated);
        validatedEmails.push(normalized);
        console.log(`✅ Email ${i + 1} validated and normalized`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
        validationErrors.push(`Email ${i + 1}: ${errorMsg}`);
        console.warn(`❌ Email ${i + 1} validation failed:`, errorMsg, item);
      }
    }

    if (validatedEmails.length === 0) {
      console.error('❌ No valid emails after validation. Errors:', validationErrors);
      return NextResponse.json(
        { error: 'No valid emails after validation', details: validationErrors },
        { status: 500 }
      );
    }
    
    console.log(`✅ ${validatedEmails.length} emails passed validation`);

    // 6. Create service client
    const serviceSupabase = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 7. Deduplicate
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

    const newEmails = validatedEmails.filter(
      email => !existingSet.has(`${email.from_email}::${email.subject}`)
    );

    if (newEmails.length === 0) {
      return NextResponse.json({
        inserted: 0,
        skipped: validatedEmails.length,
        message: 'All generated emails already exist',
      });
    }

    // 8. Insert emails
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

    console.log(`✅ Email insertion complete: ${inserted} inserted, ${skipped} skipped`);

    return NextResponse.json({
      inserted,
      skipped,
      message: `Successfully generated ${inserted} new emails`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto-generation API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}


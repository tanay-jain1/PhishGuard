/**
 * Admin-only email generator API endpoint
 * 
 * POST /api/emails/generate
 * 
 * Body: { count?: number } (default: 10, max: 20)
 * 
 * Generates realistic email samples using AWS Bedrock (Claude 3.5 Haiku)
 * Falls back to mock generator if Bedrock is not configured
 * 
 * Features:
 * - Admin-only access (allowlist-based)
 * - Rate limiting (max 20 emails per request)
 * - JSON schema validation
 * - Deduplication against existing emails
 * - Automatic feature/difficulty computation via heuristics
 * - Upsert into public.emails table
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { generateEmails, type GeneratedEmail } from '@/lib/email-generator';

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
    if (!isAdmin(authUser.id, authUser.email || null)) {
      return NextResponse.json(
        { error: 'Forbidden - admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json().catch(() => ({}));
    const requestedCount = typeof body.count === 'number' ? body.count : 10;
    
    // 4. Enforce rate limit (max 20 emails per request)
    const count = Math.min(Math.max(1, Math.floor(requestedCount)), 20);

    // 5. Generate emails
    const generationResult = await generateEmails(count);

    if (generationResult.emails.length === 0) {
      return NextResponse.json(
        { error: 'No emails generated', details: generationResult.errors },
        { status: 500 }
      );
    }

    // 6. Create service role client for database operations (bypasses RLS)
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

    // 7. Deduplicate: Check which emails already exist
    // Build a set of all (from_email, subject) combinations to check
    const emailKeys = generationResult.emails.map(e => ({
      from_email: e.from_email,
      subject: e.subject,
    }));

    // Query all existing emails that match any of our generated emails
    // We'll check each combination since Supabase doesn't support complex OR conditions easily
    const existingSet = new Set<string>();
    
    // Use a more efficient approach: batch check by from_email, then filter by subject
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

    // 8. Filter out duplicates
    const newEmails = generationResult.emails.filter(
      email => !existingSet.has(`${email.from_email}::${email.subject}`)
    );

    if (newEmails.length === 0) {
      return NextResponse.json({
        success: true,
        generated: generationResult.emails.length,
        inserted: 0,
        skipped: generationResult.emails.length,
        duplicates: generationResult.emails.length,
        source: generationResult.source,
        errors: generationResult.errors,
        message: 'All generated emails already exist in database',
      });
    }

    // 9. Prepare emails for upsert
    const emailsToInsert: Array<{
      subject: string;
      from_name: string;
      from_email: string;
      body_html: string;
      is_phish: boolean;
      features: string[];
      explanation: string;
      difficulty: 'easy' | 'medium' | 'hard';
      updated_at: string;
    }> = newEmails.map(email => ({
      subject: email.subject,
      from_name: email.from_name,
      from_email: email.from_email,
      body_html: email.body_html,
      is_phish: email.is_phish,
      features: email.features || [],
      explanation: email.explanation,
      difficulty: email.difficulty || 'medium',
      updated_at: new Date().toISOString(),
    }));

    // 10. Insert emails (duplicates already filtered out)
    // Use insert instead of upsert since we've already deduplicated
    const { data: insertedData, error: insertError } = await serviceSupabase
      .from('emails')
      .insert(emailsToInsert)
      .select('id, subject, from_email, is_phish, difficulty');

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to insert emails into database',
          details: insertError.message,
          generated: generationResult.emails.length,
          new: newEmails.length,
          source: generationResult.source,
        },
        { status: 500 }
      );
    }

    const insertedCount = insertedData?.length || 0;
    const skippedCount = generationResult.emails.length - newEmails.length;
    const duplicateCount = skippedCount;

    // 11. Return success response
    return NextResponse.json({
      success: true,
      generated: generationResult.emails.length,
      inserted: insertedCount,
      skipped: skippedCount,
      duplicates: duplicateCount,
      source: generationResult.source,
      errors: generationResult.errors,
      emails: insertedData?.map(e => ({
        id: e.id,
        subject: e.subject,
        from_email: e.from_email,
        is_phish: e.is_phish,
        difficulty: e.difficulty,
      })),
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


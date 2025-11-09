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

    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not configured');
      return NextResponse.json(
        { 
          error: 'Server configuration error - Supabase URL not configured',
          hint: 'Add NEXT_PUBLIC_SUPABASE_URL to Vercel environment variables'
        },
        { status: 500 }
      );
    }

    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json(
        { 
          error: 'Server configuration error - service role key not configured',
          hint: 'Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables. Get it from Supabase Dashboard > Settings > API > service_role key'
        },
        { status: 500 }
      );
    }
    
    console.log('✅ Service role key is configured');

    // 4. Generate emails using bedrock (or mock)
    console.log(`📧 Starting email generation for ${count} emails...`);
    console.log(`🔧 Bedrock configured: ${process.env.AWS_REGION ? 'Yes' : 'No'}`);
    
    let items: Awaited<ReturnType<typeof generateEmails>> = [];
    try {
      items = await generateEmails(count);
      console.log(`✅ Email generation completed: ${items?.length || 0} emails generated`);
      
      if (!items || !Array.isArray(items)) {
        console.error('❌ Generation returned non-array:', typeof items, items);
        return NextResponse.json(
          { error: 'Email generation returned invalid format', details: 'Expected array but got ' + typeof items },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('❌ Email generation failed:', error);
      const errorDetails = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return NextResponse.json(
        { 
          error: 'Email generation failed',
          details: errorDetails
        },
        { status: 500 }
      );
    }
    
    if (items.length === 0) {
      console.error('❌ No emails generated - items array is empty');
      return NextResponse.json(
        { error: 'No emails generated', details: 'Generation returned empty array' },
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

    // 7. Deduplicate - improved to catch all duplicates
    console.log(`🔍 Checking for duplicates among ${validatedEmails.length} emails...`);
    
    const emailKeys = validatedEmails.map(e => ({
      from_email: e.from_email.toLowerCase().trim(),
      subject: e.subject.trim(),
    }));

    const existingSet = new Set<string>();
    
    // Build a map of from_email -> subjects for efficient querying
    const fromEmailMap = new Map<string, string[]>();
    for (const key of emailKeys) {
      if (!fromEmailMap.has(key.from_email)) {
        fromEmailMap.set(key.from_email, []);
      }
      fromEmailMap.get(key.from_email)!.push(key.subject);
    }

    // Query all potential duplicates in batches
    for (const [fromEmail, subjects] of fromEmailMap.entries()) {
      const { data, error } = await serviceSupabase
        .from('emails')
        .select('from_email, subject')
        .eq('from_email', fromEmail)
        .in('subject', subjects);

      if (error) {
        console.warn(`⚠️ Error checking duplicates for ${fromEmail}:`, error);
        continue;
      }

      if (data) {
        for (const existing of data) {
          // Normalize for comparison
          const normalizedKey = `${existing.from_email.toLowerCase().trim()}::${existing.subject.trim()}`;
          existingSet.add(normalizedKey);
        }
      }
    }

    // Filter out duplicates using normalized keys
    const newEmails = validatedEmails.filter(email => {
      const normalizedKey = `${email.from_email.toLowerCase().trim()}::${email.subject.trim()}`;
      return !existingSet.has(normalizedKey);
    });

    console.log(`📊 Deduplication: ${validatedEmails.length} total, ${existingSet.size} duplicates found, ${newEmails.length} new emails`);

    if (newEmails.length === 0) {
      console.log('✅ All generated emails already exist in database');
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

    // 8. Insert emails - handle duplicates gracefully
    let inserted = 0;
    let skipped = validatedEmails.length - newEmails.length;
    
    // Try bulk insert first
    const { data: insertedData, error: insertError } = await serviceSupabase
      .from('emails')
      .insert(emailsToInsert)
      .select('id');

    if (insertError) {
      // If it's a duplicate key error, try inserting one by one to see which succeed
      if (insertError.code === '23505') {
        console.log('⚠️ Duplicate key error on bulk insert, trying individual inserts...');
        
        // Insert emails one by one to handle duplicates gracefully
        for (const email of emailsToInsert) {
          const { data: singleData, error: singleError } = await serviceSupabase
            .from('emails')
            .insert(email)
            .select('id');
          
          if (singleError) {
            if (singleError.code === '23505') {
              // This is a duplicate - skip it
              skipped++;
              console.log(`⏭️ Skipped duplicate: ${email.from_email} - ${email.subject.substring(0, 50)}`);
            } else {
              // Other error - log but continue
              console.error(`❌ Error inserting email:`, singleError);
            }
          } else if (singleData && singleData.length > 0) {
            inserted++;
          }
        }
      } else {
        // Other database error
        console.error('Database insert error:', insertError);
        return NextResponse.json(
          {
            error: 'Failed to insert emails into database',
            details: insertError.message,
            code: insertError.code,
          },
          { status: 500 }
        );
      }
    } else {
      // Success - all emails inserted
      inserted = insertedData?.length || 0;
    }

    console.log(`✅ Email insertion complete: ${inserted} inserted, ${skipped} skipped`);

    // Return success even if some were duplicates (that's expected behavior)
    return NextResponse.json({
      inserted,
      skipped,
      message: inserted > 0 
        ? `Successfully generated ${inserted} new emails${skipped > 0 ? ` (${skipped} were duplicates)` : ''}`
        : `All ${skipped} generated emails were duplicates (already exist in database)`,
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


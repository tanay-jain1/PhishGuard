import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { analyzeEmail } from '@/lib/heuristics';
import { generateEmails } from '@/lib/llm/bedrock';
import { GeneratedEmailSchema, normalizeAndScore } from '@/lib/generationSchema';

/**
 * Auto-generate emails when pool is low/empty
 * This runs automatically during gameplay - no admin needed!
 */
async function autoGenerateEmails(count: number): Promise<void> {
  try {
    // Check if service role key is available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      // Silently fail - auto-generation is optional
      console.warn('Auto-generation skipped: service role key not configured');
      return;
    }

    // Generate emails using bedrock (or mock)
    const items = await generateEmails(count);
    if (items.length === 0) {
      return;
    }

    // Validate and normalize
    const validatedEmails: Array<ReturnType<typeof normalizeAndScore>> = [];
    for (const item of items) {
      try {
        const validated = GeneratedEmailSchema.parse(item);
        const normalized = normalizeAndScore(validated);
        validatedEmails.push(normalized);
      } catch (error) {
        console.warn('Email validation failed during auto-generation:', error);
      }
    }

    if (validatedEmails.length === 0) {
      return;
    }

    // Create service client
    const serviceSupabase = createServiceClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Deduplicate
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
      return;
    }

    // Insert emails
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

    await serviceSupabase
      .from('emails')
      .insert(emailsToInsert);

    console.log(`✅ Auto-generated ${newEmails.length} emails`);
  } catch (error) {
    // Silently fail - auto-generation shouldn't break gameplay
    console.error('Auto-generation error:', error);
  }
}

export async function GET(request: Request) {
  try {
    // Get userId from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const userId = authHeader.replace('Bearer ', '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get all emails
    let { data: allEmails, error: emailsError } = await supabase
      .from('emails')
      .select('id, subject, from_name, from_email, body_html, is_phish, features, explanation, difficulty');

    if (emailsError) {
      return NextResponse.json(
        { error: 'Failed to fetch emails', details: emailsError.message },
        { status: 500 }
      );
    }

    // Auto-generate emails if pool is empty or very low
    if (!allEmails || allEmails.length === 0) {
      // Try to auto-generate emails
      try {
        console.log('📧 Email pool is empty, auto-generating 20 emails...');
        await autoGenerateEmails(20); // Generate 20 emails
        // Refetch emails after generation
        const { data: newEmails } = await supabase
          .from('emails')
          .select('id, subject, from_name, from_email, body_html, is_phish, features, explanation, difficulty');
        
        if (newEmails && newEmails.length > 0) {
          console.log(`✅ Auto-generated ${newEmails.length} emails, continuing...`);
          allEmails = newEmails;
        } else {
          console.warn('⚠️ Auto-generation completed but no emails found');
          return NextResponse.json({ done: true });
        }
      } catch (error) {
        // If auto-generation fails, return done (user can still play if emails exist)
        console.error('❌ Auto-generation failed:', error);
        return NextResponse.json({ done: true });
      }
    }

    // Get emails the user has already guessed
    const { data: guessedEmails, error: guessesError } = await supabase
      .from('guesses')
      .select('email_id')
      .eq('user_id', userId);

    if (guessesError) {
      return NextResponse.json(
        { error: 'Failed to fetch user guesses', details: guessesError.message },
        { status: 500 }
      );
    }

    const guessedEmailIds = new Set(
      guessedEmails?.map((g) => g.email_id) || []
    );

    // Filter out emails the user has already seen
    let unseenEmails = allEmails.filter(
      (email) => !guessedEmailIds.has(email.id)
    );

    // Auto-generate more emails if user has seen most/all emails
    if (unseenEmails.length < 5) {
      // Generate more emails in the background (non-blocking)
      autoGenerateEmails(20).catch(err => {
        console.error('Background email generation failed:', err);
      });
    }

    if (unseenEmails.length === 0) {
      // Wait a moment for generation, then retry
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { data: updatedEmails } = await supabase
          .from('emails')
          .select('id, subject, from_name, from_email, body_html, is_phish, features, explanation, difficulty');
        
        if (updatedEmails && updatedEmails.length > 0) {
          const newUnseen = updatedEmails.filter(
            (email) => !guessedEmailIds.has(email.id)
          );
          if (newUnseen.length > 0) {
            unseenEmails = newUnseen;
          } else {
            return NextResponse.json({ done: true });
          }
        } else {
          return NextResponse.json({ done: true });
        }
      } catch {
        return NextResponse.json({ done: true });
      }
    }

    // Difficulty weighting: prefer easy emails first, then medium, then hard
    // Weight: easy=3, medium=2, hard=1
    const difficultyWeights: Record<string, number> = {
      easy: 3,
      medium: 2,
      hard: 1,
    };

    // Create weighted array
    const weightedEmails: Array<{ email: typeof unseenEmails[0]; weight: number }> = [];
    for (const email of unseenEmails) {
      const weight = difficultyWeights[email.difficulty] || 1;
      for (let i = 0; i < weight; i++) {
        weightedEmails.push({ email, weight });
      }
    }

    // Select random email from weighted array (defaults to random if time constraint)
    const randomIndex = Math.floor(Math.random() * weightedEmails.length);
    const selectedEmail = weightedEmails[randomIndex].email;

    // Compute features/difficulty on the fly if missing
    let difficulty = selectedEmail.difficulty;
    let features = (selectedEmail.features as string[]) || [];

    if (!difficulty || !features || features.length === 0) {
      const heuristicResult = analyzeEmail({
        subject: selectedEmail.subject,
        body_html: selectedEmail.body_html,
        from_email: selectedEmail.from_email,
        from_name: selectedEmail.from_name,
      });

      // Map heuristic difficulty (1|2|3) to database format ('easy'|'medium'|'hard')
      const difficultyMap: Record<1 | 2 | 3, 'easy' | 'medium' | 'hard'> = {
        1: 'easy',
        2: 'medium',
        3: 'hard',
      };

      if (!difficulty) {
        difficulty = difficultyMap[heuristicResult.difficulty];
      }

      if (!features || features.length === 0) {
        features = heuristicResult.topReasons.map(r => r.label);
      }
    }

    return NextResponse.json({
      id: selectedEmail.id,
      subject: selectedEmail.subject,
      from_name: selectedEmail.from_name,
      from_email: selectedEmail.from_email,
      body_html: selectedEmail.body_html,
      difficulty: difficulty || 'medium', // Fallback to medium if still missing
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

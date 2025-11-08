import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    const { data: allEmails, error: emailsError } = await supabase
      .from('emails')
      .select('id, subject, from_name, from_email, body_html, is_phish, features, explanation, difficulty');

    if (emailsError) {
      return NextResponse.json(
        { error: 'Failed to fetch emails', details: emailsError.message },
        { status: 500 }
      );
    }

    if (!allEmails || allEmails.length === 0) {
      return NextResponse.json({ done: true });
    }

    // Get emails the user has already guessed
    const { data: guessedEmails } = await supabase
      .from('guesses')
      .select('email_id')
      .eq('user_id', userId);

    const guessedEmailIds = new Set(
      guessedEmails?.map((g) => g.email_id) || []
    );

    // Filter out emails the user has already seen
    const unseenEmails = allEmails.filter(
      (email) => !guessedEmailIds.has(email.id)
    );

    if (unseenEmails.length === 0) {
      return NextResponse.json({ done: true });
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

    return NextResponse.json({
      id: selectedEmail.id,
      subject: selectedEmail.subject,
      from_name: selectedEmail.from_name,
      from_email: selectedEmail.from_email,
      body_html: selectedEmail.body_html,
      difficulty: selectedEmail.difficulty,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

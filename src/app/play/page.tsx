'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import EmailViewer from '@/components/EmailViewer';
import GuessButtons from '@/components/GuessButtons';
import VerdictModal from '@/components/VerdictModal';

interface Email {
  id: string;
  subject: string;
  from_name: string;
  from_email: string;
  body_html: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface VerdictData {
  correct: boolean;
  pointsDelta: number;
  profileSnapshot: {
    points: number;
    streak: number;
    accuracy: number;
  };
  explanation: string;
  featureFlags: string[];
}

export default function PlayPage() {
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [verdictData, setVerdictData] = useState<VerdictData | null>(null);
  const [profile, setProfile] = useState<{ points: number; streak: number } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initGame = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      // Initialize profile if needed
      try {
        await fetch('/api/auth/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
      } catch (error) {
        console.error('Failed to init profile:', error);
      }

      // Fetch first email
      await fetchNextEmail(user.id);
    };

    initGame();
  }, [router, supabase]);

  const fetchNextEmail = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/emails/next', {
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      });

      const data = await response.json();

      if (data.done) {
        router.push('/leaderboard');
        return;
      }

      setEmail(data);
    } catch (error) {
      console.error('Failed to fetch email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuess = async (guessIsPhish: boolean) => {
    if (!email || submitting) return;

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/guess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          emailId: email.id,
          guessIsPhish,
        }),
      });

      const data: VerdictData = await response.json();

      setVerdictData(data);
      setProfile(data.profileSnapshot);
      setShowVerdict(true);
    } catch (error) {
      console.error('Failed to submit guess:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setShowVerdict(false);
    setVerdictData(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/');
      return;
    }

    await fetchNextEmail(user.id);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">No more emails!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            PhishGuard
          </h1>
          <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            {profile && (
              <>
                <span>
                  Points: <span className="font-semibold">{profile.points}</span>
                </span>
                <span>
                  Streak: <span className="font-semibold">{profile.streak}</span>
                </span>
              </>
            )}
            <button
              onClick={() => router.push('/leaderboard')}
              className="hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Leaderboard
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Is this email a phishing attempt?
          </h2>
        </div>

        <EmailViewer
          subject={email.subject}
          from={`${email.from_name} <${email.from_email}>`}
          body_html={email.body_html}
          difficulty={email.difficulty}
        />

        <div className="mt-6">
          <GuessButtons onGuess={handleGuess} disabled={submitting || showVerdict} />
        </div>
      </main>

      {verdictData && (
        <VerdictModal
          isOpen={showVerdict}
          isCorrect={verdictData.correct}
          pointsDelta={verdictData.pointsDelta}
          explanation={verdictData.explanation}
          featureFlags={verdictData.featureFlags}
          onClose={() => setShowVerdict(false)}
          onNext={handleNext}
        />
      )}
    </div>
  );
}

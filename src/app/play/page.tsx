'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/lib/useProfile';
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
  profile: {
    points: number;
    streak: number;
    badges: string[];
  };
  unlockedBadges?: string[];
  explanation: string;
  featureFlags: string[];
  difficulty?: string;
}

interface MlData {
  prob_phish?: number;
  reasons?: string[];
  topTokens?: string[];
}

export default function PlayPage() {
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [verdictData, setVerdictData] = useState<VerdictData | null>(null);
  const [mlData, setMlData] = useState<MlData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { refreshProfile } = useProfile();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initGame = async () => {
      // Get user - if no user, redirect to /auth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth');
        return;
      }

      // Initialize profile if needed (call once)
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
    setError(null);
    try {
      const response = await fetch('/api/emails/next', {
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch email:', response.status, errorData);
        setError(`Failed to load emails: ${errorData.error || response.statusText}`);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Email response:', data); // Debug log

      // Only redirect to leaderboard if explicitly done
      if (data.done === true) {
        setError('No more emails available. All emails have been completed!');
        // Don't auto-redirect, let user see the message
        setLoading(false);
        return;
      }

      // If we got an email, set it
      if (data.id) {
        setEmail(data);
        setError(null);
      } else {
        console.error('No email data received:', data);
        setError('No email data received from server');
      }
    } catch (error) {
      console.error('Failed to fetch email:', error);
      setError('Failed to fetch email. Please check if emails are seeded in the database.');
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
        router.push('/auth');
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

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        
        // Handle already_guessed error
        if (response.status === 409 && errorData.error === 'already_guessed') {
          alert('You have already guessed this email. Fetching next email...');
          await fetchNextEmail(user.id);
          return;
        }
        
        alert(`Error: ${errorData.error || 'Failed to submit guess'}`);
        return;
      }

      const data: VerdictData = await response.json();

      // Validate response has required fields
      if (typeof data.correct !== 'boolean') {
        console.error('Invalid response: correct field is not boolean', data);
        alert('Error: Invalid response from server');
        return;
      }

      // Ensure featureFlags is always an array
      const verdictDataWithFlags: VerdictData = {
        correct: data.correct,
        pointsDelta: data.pointsDelta ?? 0,
        profile: data.profile || { points: 0, streak: 0, badges: [] },
        unlockedBadges: data.unlockedBadges,
        explanation: data.explanation || '',
        featureFlags: data.featureFlags || [],
        difficulty: data.difficulty,
      };

      setVerdictData(verdictDataWithFlags);
      setShowVerdict(true);

      // IMPORTANT: Refresh profile from database so navbar updates immediately
      // This ensures the header shows the latest points/streak from DB
      await refreshProfile();

      // Fetch ML classification if available
      if (email) {
        try {
          const mlResponse = await fetch('/api/ml/classify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subject: email.subject,
              body_html: email.body_html,
              from_email: email.from_email,
              from_name: email.from_name,
            }),
          });

          if (mlResponse.ok) {
            const mlResult = await mlResponse.json();
            if (mlResult.ml) {
              setMlData({
                prob_phish: mlResult.ml.prob_phish,
                reasons: mlResult.ml.reasons,
                topTokens: mlResult.ml.topTokens,
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch ML classification:', error);
          // Silently fail - don't block verdict
        }
      }
    } catch (error) {
      console.error('Failed to submit guess:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setShowVerdict(false);
    setVerdictData(null);
    setMlData(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth');
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

  if (error && !email) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            If no emails are available, you may need to seed the database.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await fetchNextEmail(user.id);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/leaderboard')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Go to Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">No more emails available!</p>
          <button
            onClick={() => router.push('/leaderboard')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Leaderboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
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
          mlProbPhish={mlData?.prob_phish}
          mlReasons={mlData?.reasons}
          mlTokens={mlData?.topTokens}
          onClose={() => setShowVerdict(false)}
          onNext={handleNext}
        />
      )}
    </div>
  );
}

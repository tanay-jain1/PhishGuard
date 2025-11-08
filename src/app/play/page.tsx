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
    badges: string[];
  };
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
  const [profile, setProfile] = useState<{ points: number; streak: number; badges: string[] } | null>(null);
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

      // Fetch profile row (select points, streak, badges)
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('points, streak, badges')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile({
            points: profileData.points || 0,
            streak: profileData.streak || 0,
            badges: (profileData.badges as string[]) || [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
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
        profileSnapshot: data.profileSnapshot,
        explanation: data.explanation || '',
        featureFlags: data.featureFlags || [],
        difficulty: data.difficulty,
      };

      setVerdictData(verdictDataWithFlags);
      
      // IMPORTANT: Use API snapshot as single source of truth - no client-side math
      // The API returns the exact values from the database after commit
      setProfile({
        points: data.profileSnapshot.points,
        streak: data.profileSnapshot.streak,
        badges: data.profileSnapshot.badges || [],
      });
      setShowVerdict(true);

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
                {profile.badges && profile.badges.length > 0 && (
                  <span>
                    Badges: <span className="font-semibold">{profile.badges.length}</span>
                  </span>
                )}
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


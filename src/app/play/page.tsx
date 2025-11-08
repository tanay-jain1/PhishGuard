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
      router.push('/');
      return;
    }

    await fetchNextEmail(user.id);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#1b2a49]/70">Loading...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-8 shadow-xl max-w-md w-full">
          <h2 className="mb-4 text-2xl font-bold text-[#1b2a49]">
            No more emails!
          </h2>
          <p className="mb-4 text-[#1b2a49]/80">
            You've completed all available emails. Great job!
          </p>
          <button
            onClick={() => router.push('/leaderboard')}
            className="rounded-xl bg-[#1b2a49] px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-[#2e4e3f] shadow-md hover:shadow-lg"
          >
            View Leaderboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-8">
          <h1 className="text-xl font-bold text-[#1b2a49]">
            PhishGuard
          </h1>
          <div className="flex items-center gap-4 text-sm text-[#1b2a49]/70">
            {profile && (
              <>
                <span>
                  Points: <span className="font-semibold text-[#1b2a49]">{profile.points}</span>
                </span>
                <span>
                  Streak: <span className="font-semibold text-[#1b2a49]">{profile.streak}</span>
                </span>
              </>
            )}
            <button
              onClick={() => router.push('/leaderboard')}
              className="hover:text-[#1b2a49] font-medium transition-colors"
            >
              Leaderboard
            </button>
            <button
              onClick={() => router.push('/resources')}
              className="hover:text-[#1b2a49] font-medium transition-colors"
            >
              Resources
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-[#1b2a49]">
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

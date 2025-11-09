'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useProfileContext } from '@/providers/profile-provider';
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
  isPhish?: boolean; // Actual answer from database
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
  const [consecutiveWrongs, setConsecutiveWrongs] = useState(0);
  const { refreshProfile } = useProfileContext();
  const router = useRouter();
  const supabase = createClient();

  const fetchNextEmail = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/emails/next', {
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(async () => {
          const text = await response.text().catch(() => '');
          console.error('API error - non-JSON response', {
            status: response.status,
            statusText: response.statusText,
            text: text.substring(0, 200),
          });
          return null;
        });

        if (errorData && errorData.error) {
          const errorMessage = typeof errorData.error === 'string' 
            ? errorData.error 
            : 'Failed to load emails';
          setError(errorMessage);
          alert(`Error: ${errorMessage}`);
        } else {
          const errorMessage = `Failed to load emails (${response.status}: ${response.statusText})`;
          setError(errorMessage);
          alert(errorMessage);
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Email response:', data); // Debug log

      // Only redirect to leaderboard if explicitly done
      if (data.done === true) {
        // Try to auto-generate emails when pool is empty
        try {
          const generateResponse = await fetch('/api/emails/auto-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: 20 }),
          });
          
          if (generateResponse.ok) {
            // Retry fetching email after generation
            setTimeout(() => {
              fetchNextEmail(userId);
            }, 500);
            return;
          }
        } catch (genError) {
          console.error('Auto-generation failed:', genError);
        }
        
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
  }, []);

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

      // Profile initialization is handled by useProfile hook and /api/auth/init
      // Don't call it here as it would reset points/streak
      
      // Fetch first email
      await fetchNextEmail(user.id);
    };

    initGame();
  }, [fetchNextEmail, router, supabase]);

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
        const errorData = await response.json().catch(async () => {
          const text = await response.text().catch(() => '');
          console.error('API error - non-JSON response', {
            status: response.status,
            statusText: response.statusText,
            text: text.substring(0, 200),
          });
          return null;
        });

        // Handle already_guessed error
        if (response.status === 409 && errorData?.error === 'already_guessed') {
          alert('You have already guessed this email. Fetching next email...');
          await fetchNextEmail(user.id);
          return;
        }
        
        // Show friendly error message
        if (errorData && errorData.error && typeof errorData.error === 'string') {
          alert(`Error: ${errorData.error}`);
        } else {
          const errorMessage = `Failed to submit guess (${response.status}: ${response.statusText})`;
          alert(errorMessage);
          console.error('Failed to submit guess - no error details available', {
            status: response.status,
            statusText: response.statusText,
          });
        }
        return;
      }

      const data: VerdictData = await response.json();

      // Validate response has required fields
      if (typeof data.correct !== 'boolean') {
        console.error('Invalid response: correct field is not boolean', data);
        alert('Error: Invalid response from server');
        return;
      }

      // IMPORTANT: Refresh profile from database AFTER processing guess
      // This ensures the header shows the latest points/streak from DB
      await refreshProfile();

      // Ensure featureFlags is always an array
      const verdictDataWithFlags: VerdictData = {
        correct: data.correct,
        pointsDelta: data.pointsDelta ?? 0,
        profile: data.profile || { points: 0, streak: 0, badges: [] },
        unlockedBadges: data.unlockedBadges,
        explanation: data.explanation || '',
        featureFlags: data.featureFlags || [],
        difficulty: data.difficulty,
        isPhish: data.isPhish, // Pass through actual answer from database
      };
      
      // Debug: Log the actual answer to verify it's being passed
      if (data.isPhish !== undefined) {
        console.log('Email actual answer (isPhish):', data.isPhish, typeof data.isPhish);
      }

      setVerdictData(verdictDataWithFlags);
      setShowVerdict(true);

      // Track consecutive wrong answers
      if (!data.correct) {
        setConsecutiveWrongs((prev) => prev + 1);
      } else {
        setConsecutiveWrongs(0);
      }

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
              // Only set ML data if we have meaningful insights (reasons or tokens)
              // Probability alone isn't enough - we need the detailed analysis
              const hasReasons = mlResult.ml.reasons && mlResult.ml.reasons.length > 0;
              const hasTokens = mlResult.ml.topTokens && mlResult.ml.topTokens.length > 0;
              
              if (hasReasons || hasTokens) {
                setMlData({
                  prob_phish: mlResult.ml.prob_phish,
                  reasons: mlResult.ml.reasons,
                  topTokens: mlResult.ml.topTokens,
                });
              } else {
                // ML returned probability but no insights - don't show Model Assist
                console.warn('ML returned probability but no reasons/tokens - not showing Model Assist');
                setMlData(null);
              }
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

  const handleQuizComplete = () => {
    // Reset consecutive wrongs counter after quiz completion
    setConsecutiveWrongs(0);
  };

  const showRecapQuiz = consecutiveWrongs >= 3 && verdictData && !verdictData.correct;

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
            Click the button below to automatically generate new emails for the game.
          </p>
          <div className="flex flex-col gap-2 justify-center items-center">
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  // Try to generate emails first
                  const genResponse = await fetch('/api/emails/auto-generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count: 20 }),
                  });
                  
                  if (genResponse.ok) {
                    const genData = await genResponse.json();
                    setError(`Generated ${genData.inserted || 0} new emails! Loading...`);
                    // Wait a moment then fetch email
                    setTimeout(async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) await fetchNextEmail(user.id);
                    }, 1000);
                  } else {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) await fetchNextEmail(user.id);
                  }
                } catch {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) await fetchNextEmail(user.id);
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Generate Emails & Retry
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
          showRecapQuiz={showRecapQuiz ?? false}
          consecutiveWrongs={consecutiveWrongs}
          unlockedBadges={verdictData.unlockedBadges}
          isPhish={verdictData.isPhish}
          onClose={() => setShowVerdict(false)}
          onNext={handleNext}
          onQuizComplete={handleQuizComplete}
        />
      )}
    </div>
  );
}

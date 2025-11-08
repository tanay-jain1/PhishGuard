'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Email } from '@/types/game';
import { emails } from '@/data/emails';
import VerdictModal from '@/components/VerdictModal';

export default function PlayPage() {
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null);
  const [emailIndex, setEmailIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [correctGuesses, setCorrectGuesses] = useState(0);
  const [showVerdict, setShowVerdict] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const initGame = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);
      loadEmail(0);
      setLoading(false);
    };
    initGame();
  }, [router, supabase]);

  const loadEmail = (index: number) => {
    if (index >= emails.length) {
      // Game complete
      return;
    }
    setCurrentEmail(emails[index]);
    setEmailIndex(index);
  };

  const handleGuess = async (guess: boolean) => {
    if (!currentEmail) return;

    const correct = guess === currentEmail.isPhishing;
    setIsCorrect(correct);
    setTotalGuesses((prev) => prev + 1);
    if (correct) {
      setScore((prev) => prev + 10);
      setCorrectGuesses((prev) => prev + 1);
    }
    setShowVerdict(true);

    // Save to database
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('game_sessions').upsert({
          user_id: user.id,
          score: correct ? score + 10 : score,
          total_guesses: totalGuesses + 1,
          correct_guesses: correct ? correctGuesses + 1 : correctGuesses,
          current_email_index: emailIndex,
          completed: emailIndex + 1 >= emails.length,
        });
      }
    } catch (error) {
      console.error('Error saving game session:', error);
    }
  };

  const handleNext = async () => {
    setShowVerdict(false);
    if (emailIndex + 1 < emails.length) {
      loadEmail(emailIndex + 1);
    } else {
      // Game complete - update leaderboard
      try {
        await fetch('/api/leaderboard/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score }),
        });
      } catch (error) {
        console.error('Error updating leaderboard:', error);
      }
      router.push('/leaderboard');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!currentEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Game Complete!
          </h2>
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">
            Final Score: {score} | Accuracy: {totalGuesses > 0 ? Math.round((correctGuesses / totalGuesses) * 100) : 0}%
          </p>
          <button
            onClick={() => router.push('/leaderboard')}
            className="rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            View Leaderboard
          </button>
        </div>
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
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Score: <span className="font-semibold">{score}</span> |{' '}
              {correctGuesses}/{totalGuesses} correct
            </div>
            <button
              onClick={() => router.push('/leaderboard')}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Leaderboard
            </button>
            <button
              onClick={() => router.push('/resources')}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Resources
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Is this email a phishing attempt?
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Email {emailIndex + 1} of {emails.length}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-2">
              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                From:{' '}
              </span>
              <span className="text-zinc-900 dark:text-zinc-50">
                {currentEmail.from}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                To:{' '}
              </span>
              <span className="text-zinc-900 dark:text-zinc-50">
                {currentEmail.to}
              </span>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Subject:{' '}
              </span>
              <span className="text-zinc-900 dark:text-zinc-50">
                {currentEmail.subject}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-50">
              {currentEmail.body}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => handleGuess(false)}
            disabled={showVerdict}
            className="flex-1 rounded-md border-2 border-green-500 bg-green-50 px-6 py-4 text-lg font-semibold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
          >
            ✓ Legitimate
          </button>
          <button
            onClick={() => handleGuess(true)}
            disabled={showVerdict}
            className="flex-1 rounded-md border-2 border-red-500 bg-red-50 px-6 py-4 text-lg font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            ✗ Phishing
          </button>
        </div>
      </main>

      <VerdictModal
        isOpen={showVerdict}
        isCorrect={isCorrect}
        explanation={currentEmail.explanation}
        redFlags={currentEmail.redFlags}
        onClose={() => setShowVerdict(false)}
        onNext={handleNext}
      />
    </div>
  );
}


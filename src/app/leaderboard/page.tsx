'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  accuracy: number;
  totalGuesses: number;
  correctGuesses: number;
  created_at: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      setCurrentUserId(user.id);

      try {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();

        if (data.entries) {
          setEntries(data.entries);
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
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
            <Link
              href="/play"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Play
            </Link>
            <Link
              href="/profile"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Profile
            </Link>
            <Link
              href="/resources"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Resources
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="mb-6 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Leaderboard
        </h2>

        {entries.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-600 dark:text-zinc-400">
              No scores yet. Be the first to play!
            </p>
            <Link
              href="/play"
              className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              Start Playing
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Username
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Points
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {entries.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    className={
                      entry.userId === currentUserId
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }
                  >
                    <td className="px-6 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-900 dark:text-zinc-50">
                      {entry.username}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {entry.points}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-zinc-600 dark:text-zinc-400">
                      {entry.accuracy.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

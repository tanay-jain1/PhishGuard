'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LeaderboardEntry {
  userId: string;
  username: string | null;
  points: number;
  streak: number;
  accuracy: number;
  created_at?: string;
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
        // Fetch from server API route to ensure fresh data (no caching)
        const response = await fetch('/api/leaderboard', {
          cache: 'no-store',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to fetch leaderboard:', errorData);
          setEntries([]);
          setLoading(false);
          return;
        }

        const { entries: leaderboardEntries } = await response.json();
        setEntries(leaderboardEntries || []);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  // Helper function to get display name (username or short id)
  const getDisplayName = (username: string | null, userId: string): string => {
    if (username && username.trim().length > 0) {
      return username;
    }
    // Return first 8 characters of user ID
    return userId.substring(0, 8);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#1b2a49]/70">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="mb-6 text-3xl font-bold text-[#1b2a49]">
          Leaderboard
        </h2>

        {entries.length === 0 ? (
          <div className="rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-8 text-center shadow-md">
            <p className="text-[#1b2a49]/70 mb-4">
              No scores yet. Be the first to play!
            </p>
            <Link
              href="/play"
              className="inline-block rounded-xl bg-[#1b2a49] px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-[#2e4e3f] shadow-md hover:shadow-lg"
            >
              Start Playing
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm shadow-xl">
            <table className="w-full">
              <thead className="border-b-2 border-[#f5f0e6] bg-[#dbeafe]/30">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#1b2a49]">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#1b2a49]">
                    Username
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-[#1b2a49]">
                    Points
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-[#1b2a49]">
                    Streak
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-[#1b2a49]">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f0e6]">
                {entries.map((entry, index) => (
                  <tr
                    key={entry.userId}
                    className={
                      entry.userId === currentUserId
                        ? 'bg-[#dbeafe]/40'
                        : 'hover:bg-[#f5f0e6]/30'
                    }
                  >
                    <td className="px-6 py-4 text-sm font-medium text-[#1b2a49]">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#1b2a49]">
                      {getDisplayName(entry.username, entry.userId)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-semibold text-[#1b2a49]">
                      {entry.points}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#1b2a49]">
                      {entry.streak}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-[#1b2a49]/70">
                      {(entry.accuracy * 100).toFixed(1)}%
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

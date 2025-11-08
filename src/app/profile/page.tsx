'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Profile {
  points: number;
  streak: number;
  username: string | null;
  email: string;
}

interface Stats {
  totalGuesses: number;
  correctGuesses: number;
  accuracy: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
        return;
      }

      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('points, streak, username, email')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch stats
        const { count: totalGuesses } = await supabase
          .from('guesses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { count: correctGuesses } = await supabase
          .from('guesses')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_correct', true);

        const total = totalGuesses || 0;
        const correct = correctGuesses || 0;
        const accuracy = total > 0 ? (correct / total) * 100 : 0;

        setStats({
          totalGuesses: total,
          correctGuesses: correct,
          accuracy: Math.round(accuracy * 100) / 100,
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
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
              href="/leaderboard"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Leaderboard
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
          Profile
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Points
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {profile?.points || 0}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Current Streak
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {profile?.streak || 0}
                </div>
              </div>
              {stats && (
                <>
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Accuracy
                    </div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {stats.accuracy.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Total Guesses
                    </div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {stats.totalGuesses}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Username
                </div>
                <div className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                  {profile?.username || 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Email
                </div>
                <div className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                  {profile?.email || 'N/A'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


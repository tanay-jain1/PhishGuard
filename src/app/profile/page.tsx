'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBadgeById, BADGES } from '@/lib/badges';

interface SummaryData {
  points: number;
  streak: number;
  accuracy: number;
  totalGuesses: number;
  badges: string[];
  nextBadge: {
    id: string;
    percent: number;
    current: number;
    target: number;
  } | null;
  perLevel: {
    easyCorrect: number;
    mediumCorrect: number;
    hardCorrect: number;
  };
}

export default function ProfilePage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameValue, setUsernameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchSummary = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/profile/summary', {
        headers: {
          Authorization: `Bearer ${user.id}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile summary');
      }

      const data = await response.json();
      setSummary(data);

      // Fetch username separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUsername(profile.username);
        setUsernameValue(profile.username || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [router, supabase]);

  const handleSaveUsername = async () => {
    if (!usernameValue.trim()) {
      setError('Username cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({ username: usernameValue.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to update username');
        setSaving(false);
        return;
      }

      setUsername(usernameValue.trim());
      setEditingUsername(false);
      setError(null);
      await fetchSummary();
    } catch (error) {
      console.error('Failed to save username:', error);
      setError('Failed to save username');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUsername(false);
    setUsernameValue(username || '');
    setError(null);
  };

  if (loading || !summary) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  const hasUsername = username && username.trim().length > 0;
  const nextBadge = summary.nextBadge ? getBadgeById(summary.nextBadge.id) : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
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
                  {summary.points}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Current Streak
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {summary.streak}
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Accuracy
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {(summary.accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Total Guesses
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {summary.totalGuesses}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                  Username
                </div>
                {!hasUsername ? (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Enter username"
                      value={usernameValue}
                      onChange={(e) => {
                        setUsernameValue(e.target.value);
                        setError(null);
                      }}
                      disabled={saving}
                      className="max-w-xs"
                    />
                    {error && (
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveUsername}
                        disabled={saving || !usernameValue.trim()}
                        size="sm"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                ) : editingUsername ? (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={usernameValue}
                      onChange={(e) => {
                        setUsernameValue(e.target.value);
                        setError(null);
                      }}
                      disabled={saving}
                      className="max-w-xs"
                    />
                    {error && (
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveUsername}
                        disabled={saving || !usernameValue.trim()}
                        size="sm"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      {username}
                    </div>
                    <Button
                      onClick={() => {
                        setEditingUsername(true);
                        setUsernameValue(username || '');
                        setError(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Badge chips */}
              {summary.badges && summary.badges.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    Badges
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summary.badges.map((badgeId) => {
                      const badge = getBadgeById(badgeId);
                      if (!badge) return null;
                      return (
                        <span
                          key={badgeId}
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        >
                          <span>{badge.icon}</span>
                          <span>{badge.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Next Badge Card */}
        {summary.nextBadge && nextBadge && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Next Badge</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{nextBadge.icon}</span>
                <div>
                  <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    {nextBadge.name}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {nextBadge.description}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${summary.nextBadge.percent}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {summary.nextBadge.current} / {summary.nextBadge.target}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Badges Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>All Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.badges && summary.badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {summary.badges.map((badgeId) => {
                  const badge = getBadgeById(badgeId);
                  if (!badge) return null;
                  return (
                    <div
                      key={badgeId}
                      className="rounded-lg border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="mb-2 text-4xl">{badge.icon}</div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {badge.name}
                      </div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {badge.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-zinc-600 dark:text-zinc-400">
                <p className="mb-2">No badges earned yet!</p>
                <p className="text-sm">
                  Start playing to earn your first badge.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

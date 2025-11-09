'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useProfileContext } from '@/providers/profile-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getUserBadges, BADGES } from '@/lib/badges';

interface Stats {
  totalGuesses: number;
  correctGuesses: number;
  accuracy: number;
}

export default function ProfilePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameValue, setUsernameValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { profile, loading, refreshProfile, updateUsername } = useProfileContext();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth');
        return;
      }

      // Initialize username value from profile
      if (profile) {
        setUsernameValue(profile.username || '');
      }
    };

    checkAuth();
  }, [router, supabase, profile]);

  const handleSaveUsername = async () => {
    if (!usernameValue.trim()) {
      setError('Username cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Call updateUsername from hook (this already calls refreshProfile internally)
      const result = await updateUsername(usernameValue.trim());

      if (!result.success) {
        setError(result.error || 'Failed to update username');
        setSaving(false);
        return;
      }

      // Explicitly refresh profile to ensure hook state is updated
      await refreshProfile();

      setEditingUsername(false);
      setError(null);
    } catch (error) {
      console.error('Failed to save username:', error);
      setError('Failed to save username');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUsername(false);
    setUsernameValue(profile?.username || '');
    setError(null);
  };

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      try {
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
        console.error('Failed to fetch stats:', error);
      }
    };

    if (profile) {
      fetchStats();
    }
  }, [profile, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  const hasUsername = profile?.username && profile.username.trim().length > 0;

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
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Accuracy
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {profile?.accuracy !== undefined
                    ? `${(profile.accuracy * 100).toFixed(1)}%`
                    : stats
                    ? `${stats.accuracy.toFixed(1)}%`
                    : '0.0%'}
                </div>
              </div>
              {stats && (
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    Total Guesses
                  </div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {stats.totalGuesses}
                  </div>
                </div>
              )}
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
                  // Show form to set username
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
                  // Show edit form
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
                  // Show username with edit button
                  <div className="space-y-2">
                    <div className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      {profile?.username}
                    </div>
                    <Button
                      onClick={() => {
                        setEditingUsername(true);
                        setUsernameValue(profile?.username || '');
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
            </CardContent>
          </Card>
        </div>

        {/* Badges Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.badges && profile.badges.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {getUserBadges(profile.badges).map((badge) => (
                  <div
                    key={badge.id}
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
                ))}
              </div>
            ) : (
              <div className="text-center text-zinc-600 dark:text-zinc-400">
                <p className="mb-2">No badges earned yet!</p>
                <p className="text-sm">
                  Start playing to earn your first badge at 5 points.
                </p>
              </div>
            )}

            {/* Show next badge to unlock */}
            {profile && (
              <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Next Badge
                </div>
                {(() => {
                  const nextBadge = BADGES.find(
                    (badge) => !profile.badges?.includes(badge.id)
                  );
                  if (nextBadge) {
                    const pointsNeeded = nextBadge.threshold - (profile.points || 0);
                    return (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{nextBadge.icon}</span>
                          <div>
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                              {nextBadge.name}
                            </div>
                            <div className="text-xs text-zinc-600 dark:text-zinc-400">
                              {pointsNeeded > 0
                                ? `${pointsNeeded} more points needed`
                                : 'Unlocked!'}
                            </div>
                          </div>
                        </div>
                        {pointsNeeded > 0 && (
                          <div className="mt-2">
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((profile.points || 0) / nextBadge.threshold) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                              {profile.points || 0} / {nextBadge.threshold} points
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                      🏆 You've earned all badges! Amazing work!
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

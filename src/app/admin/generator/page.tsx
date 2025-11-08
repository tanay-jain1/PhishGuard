'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface EmailStats {
  total: number;
  difficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  phish: {
    phishing: number;
    legitimate: number;
  };
}

interface GenerationResult {
  inserted: number;
  skipped: number;
}

export default function AdminGeneratorPage() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [count, setCount] = useState(10);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check auth and authorization on load
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth');
        return;
      }

      // Check if user is admin by trying to access the API with invalid count
      // This will fail validation but won't generate emails, and will reveal auth status
      try {
        const testResponse = await fetch('/api/admin/generate-emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 0 }), // Invalid count to avoid generation
        });

        if (testResponse.status === 403) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        if (testResponse.status === 401) {
          router.push('/auth');
          return;
        }

        // If we get here, user is authorized (validation errors are fine, 403/401 are the important ones)
        setAuthorized(true);
        await fetchStats();
      } catch (err) {
        console.error('Auth check failed:', err);
        // On network error, assume not authorized to be safe
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/emails/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError('Failed to load statistics');
    }
  };

  const handleGenerate = async () => {
    if (count < 1 || count > 20) {
      setError('Count must be between 1 and 20');
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          setAuthorized(false);
          return;
        }
        if (response.status === 401) {
          router.push('/auth');
          return;
        }
        throw new Error(data.error || 'Failed to generate emails');
      }

      setResult(data);
      // Refetch stats after successful generation
      await fetchStats();
    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate emails');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access this page. Admin privileges required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Email Generator
        </h1>

        {/* Stats Card */}
        {stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Email Statistics</CardTitle>
              <CardDescription>Current database statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Emails</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {stats.total}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Phishing</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {stats.phish.phishing}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Legitimate</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.phish.legitimate}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Easy</div>
                  <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.difficulty.easy}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Medium</div>
                  <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.difficulty.medium}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">Hard</div>
                  <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {stats.difficulty.hard}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generator Card */}
        <Card>
          <CardHeader>
            <CardTitle>Generate Emails</CardTitle>
            <CardDescription>
              Generate new email samples using AWS Bedrock (or mock generator)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="count" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                Number of emails (1-20)
              </label>
              <Input
                id="count"
                type="number"
                min="1"
                max="20"
                value={count}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 1 && value <= 20) {
                    setCount(value);
                    setError(null);
                  }
                }}
                disabled={generating}
                className="max-w-xs"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {result && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
                <div className="font-semibold">Generation Complete</div>
                <div className="mt-1">
                  Inserted: {result.inserted} | Skipped: {result.skipped}
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={generating || count < 1 || count > 20}
              className="w-full sm:w-auto"
            >
              {generating ? 'Generating...' : 'Generate Emails'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


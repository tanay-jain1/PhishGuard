'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/play`,
        },
      });

      if (signInError) throw signInError;

      setMessage('Check your email for the magic link! Click the link to sign in.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send magic link';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle auth callback (when user clicks magic link)
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Initialize profile after successful login
        try {
          await fetch('/api/auth/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          });
        } catch (initError) {
          console.error('Failed to init profile:', initError);
          // Continue anyway - profile will be created on play page
        }

        router.push('/play');
        router.refresh();
      }
    };

    checkAuth();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-bold text-[#1b2a49]">
          Sign In
        </h1>
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1b2a49]">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#f5f0e6] bg-white px-3 py-2 text-[#1b2a49] focus:border-[#1b2a49] focus:outline-none focus:ring-2 focus:ring-[#1b2a49]/20"
              placeholder="you@example.com"
            />
          </div>
          {message && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1b2a49] px-4 py-3 font-semibold text-white transition-all duration-300 hover:bg-[#2e4e3f] disabled:opacity-50 shadow-md hover:shadow-lg"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#1b2a49]/70">
          We'll send you a secure link to sign in. No password needed!
        </p>
      </div>
    </div>
  );
}

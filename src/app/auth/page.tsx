'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Initialize profile after successful login
        if (data.user) {
          try {
            await fetch('/api/auth/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id }),
            });
          } catch (initError) {
            console.error('Failed to init profile:', initError);
            // Continue anyway - profile will be created on play page
          }
        }

        router.push('/play');
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username || email.split('@')[0] },
          },
        });
        if (signUpError) throw signUpError;

        // Initialize profile after successful signup
        if (data.user) {
          try {
            await fetch('/api/auth/init', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: data.user.id }),
            });
          } catch (initError) {
            console.error('Failed to init profile:', initError);
            // Continue anyway - profile will be created on play page
          }
        }

        router.push('/play');
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-bold text-[#1b2a49]">
          {isLogin ? 'Sign In' : 'Sign Up'}
        </h1>
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-[#1b2a49]">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#f5f0e6] bg-white px-3 py-2 text-[#1b2a49] focus:border-[#1b2a49] focus:outline-none focus:ring-2 focus:ring-[#1b2a49]/20"
                placeholder="Choose a username"
              />
            </div>
          )}
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
          <div>
            <label className="block text-sm font-medium text-[#1b2a49]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-[#f5f0e6] bg-white px-3 py-2 text-[#1b2a49] focus:border-[#1b2a49] focus:outline-none focus:ring-2 focus:ring-[#1b2a49]/20"
              placeholder="••••••••"
            />
          </div>
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
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#1b2a49]/70">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="font-semibold text-[#1b2a49] underline hover:text-[#2e4e3f]"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

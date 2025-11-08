import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/play');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 px-8 py-16">
        <div className="text-center">
          <h1 className="mb-4 text-5xl font-bold text-zinc-900 dark:text-zinc-50">
            PhishGuard
          </h1>
          <p className="mb-8 text-xl text-zinc-600 dark:text-zinc-400">
            Learn to spot phishing emails and protect yourself online
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          <Link
            href="/auth"
            className="block w-full rounded-md bg-zinc-900 px-6 py-3 text-center font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get Started
          </Link>
          <Link
            href="/resources"
            className="block w-full rounded-md border border-zinc-300 px-6 py-3 text-center font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            Learn More
          </Link>
        </div>

        <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>Test your skills • Compete on the leaderboard • Stay safe online</p>
        </div>
      </main>
    </div>
  );
}

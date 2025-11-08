'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResourcesPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/');
      }
    };

    checkAuth();
  }, [router, supabase]);

  const resources = [
    {
      name: 'CISA - Phishing Campaigns',
      url: 'https://www.cisa.gov/news-events/news/phishing-campaigns',
      description: 'Cybersecurity and Infrastructure Security Agency resources on phishing',
    },
    {
      name: 'FTC - Phishing',
      url: 'https://www.ftc.gov/news-events/topics/identity-theft/phishing',
      description: 'Federal Trade Commission guide to recognizing and avoiding phishing',
    },
    {
      name: 'OWASP - Phishing',
      url: 'https://owasp.org/www-community/attacks/Phishing',
      description: 'Open Web Application Security Project phishing attack information',
    },
    {
      name: 'UMass IT Security',
      url: 'https://www.umass.edu/it/security',
      description: 'UMass IT Security resources and best practices',
    },
    {
      name: 'FBI - Phishing Scams',
      url: 'https://www.fbi.gov/scams-and-safety/common-scams-and-crimes/phishing',
      description: 'FBI information on phishing scams and how to report them',
    },
  ];

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
              href="/profile"
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Profile
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
          Resources
        </h2>

        <div className="space-y-4">
          {resources.map((resource, index) => (
            <div
              key={index}
              className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-lg font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                {resource.name}
              </a>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {resource.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="mb-6 text-3xl font-bold text-[#1b2a49]">
          Resources
        </h2>

        <div className="space-y-4">
          {resources.map((resource, index) => (
            <div
              key={index}
              className="rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-4 shadow-md"
            >
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-lg font-semibold text-[#1b2a49] hover:text-[#2e4e3f] underline transition-colors"
              >
                {resource.name}
              </a>
              <p className="mt-1 text-sm text-[#1b2a49]/80">
                {resource.description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

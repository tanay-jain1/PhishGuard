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
      name: 'IT Governance – 5 Ways to Detect a Phishing Email',
      url: 'https://www.itgovernance.co.uk/blog/5-ways-to-detect-a-phishing-email',
      description: 'Five simple, actionable strategies to identify phishing emails, including spotting fake links, urgent wording, and suspicious attachments.',
    },
    {
      name: 'FTC – How to Recognize and Avoid Phishing Scams',
      url: 'https://consumer.ftc.gov/articles/how-recognize-avoid-phishing-scams',
      description: 'Federal Trade Commission\'s official guide on recognizing, avoiding, and reporting phishing attempts.',
    },
    {
      name: 'NCSC (UK) – Dealing with Suspicious Emails, Phone Calls and Texts',
      url: 'https://www.ncsc.gov.uk/guidance/suspicious-email-actions',
      description: 'How to spot suspicious messages and what to do with them, from the UK\'s National Cyber Security Centre.',
    },
    {
      name: 'UMass IT Security',
      url: 'https://www.umass.edu/it/security/phishing',
      description: 'UMass IT\'s dedicated page on identifying phishing scams, with campus-specific examples and prevention tips.',
    },
    {
      name: 'FBI – Spoofing and Phishing Scams',
      url: 'https://www.fbi.gov/how-we-can-help-you/scams-and-safety/common-frauds-and-scams/spoofing-and-phishing',
      description: 'Information from the FBI about phishing and spoofing scams, along with steps to report incidents through the Internet Crime Complaint Center (IC3).',
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

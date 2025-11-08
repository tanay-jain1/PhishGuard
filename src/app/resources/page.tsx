import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ResourcesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
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
          Phishing Education Resources
        </h2>

        <div className="space-y-6">
          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              What is Phishing?
            </h3>
            <p className="text-zinc-700 dark:text-zinc-300">
              Phishing is a cyber attack that uses fraudulent emails, text
              messages, or websites to trick you into revealing sensitive
              information like passwords, credit card numbers, or social security
              numbers. Attackers often impersonate legitimate organizations to
              gain your trust.
            </p>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Common Red Flags
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-zinc-700 dark:text-zinc-300">
              <li>
                <strong>Urgent or threatening language:</strong> Phishers often
                create a sense of urgency to make you act without thinking.
              </li>
              <li>
                <strong>Suspicious sender addresses:</strong> Check the email
                domain carefully. Legitimate companies use their official
                domains.
              </li>
              <li>
                <strong>Generic greetings:</strong> Real companies usually
                address you by name, not "Dear Customer" or "Valued User".
              </li>
              <li>
                <strong>Requests for sensitive information:</strong> Legitimate
                organizations never ask for passwords, SSNs, or bank details via
                email.
              </li>
              <li>
                <strong>Suspicious links:</strong> Hover over links to see the
                actual URL. Phishing links often look similar but are slightly
                different from the real domain.
              </li>
              <li>
                <strong>Poor grammar and spelling:</strong> Many phishing emails
                contain typos and grammatical errors.
              </li>
              <li>
                <strong>Unexpected attachments:</strong> Be wary of attachments
                you weren't expecting, especially from unknown senders.
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              How to Protect Yourself
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-zinc-700 dark:text-zinc-300">
              <li>
                <strong>Verify the sender:</strong> If you're unsure about an
                email, contact the organization directly using a phone number or
                website you know is legitimate.
              </li>
              <li>
                <strong>Don't click suspicious links:</strong> Instead, navigate
                to the website directly by typing the URL in your browser.
              </li>
              <li>
                <strong>Enable two-factor authentication:</strong> This adds an
                extra layer of security even if your password is compromised.
              </li>
              <li>
                <strong>Keep software updated:</strong> Regular updates patch
                security vulnerabilities.
              </li>
              <li>
                <strong>Use strong, unique passwords:</strong> Consider using a
                password manager.
              </li>
              <li>
                <strong>Report phishing attempts:</strong> Forward suspicious
                emails to the organization being impersonated and to your email
                provider.
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Additional Resources
            </h3>
            <ul className="space-y-2 text-zinc-700 dark:text-zinc-300">
              <li>
                <a
                  href="https://www.cisa.gov/news-events/news/phishing-campaigns"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  CISA - Phishing Campaigns
                </a>
              </li>
              <li>
                <a
                  href="https://www.fbi.gov/scams-and-safety/common-scams-and-crimes/phishing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  FBI - Phishing Scams
                </a>
              </li>
              <li>
                <a
                  href="https://www.ftc.gov/news-events/topics/identity-theft/phishing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  FTC - Phishing
                </a>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}


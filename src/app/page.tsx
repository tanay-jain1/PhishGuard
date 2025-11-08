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
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Framed Container */}
      <div className="w-[90%] max-w-6xl h-[90vh] min-h-[600px] rounded-3xl border-2 border-[#f5f0e6]/60 bg-white/80 backdrop-blur-sm shadow-xl flex flex-col items-center justify-between px-6 py-8 sm:px-8 sm:py-12 md:px-12 md:py-16">
        {/* Title Section */}
        <div className="text-center space-y-6 sm:space-y-8 max-w-3xl">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight text-[#1b2a49]">
              PhishGuard
            </h1>
            <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-[#2e4e3f] to-transparent opacity-40"></div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1b2a49] leading-snug">
              Master Phishing Awareness
            </h2>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1b2a49] leading-snug">
              Through Safe Practice
            </h2>
            
            <div className="pt-2">
              <p className="text-base sm:text-lg md:text-xl leading-relaxed text-[#1b2a49]/80 max-w-2xl mx-auto font-normal">
                Build your cybersecurity intuition with real-world examples and instant feedback.
                PhishGuard helps you recognize online threats confidently before they catch you.
              </p>
            </div>
          </div>
        </div>

        {/* Middle Content Section */}
        <div className="flex flex-col items-center gap-6 sm:gap-8 w-full max-w-md">
          {/* Divider */}
          <div className="w-full">
            <div className="h-px bg-gradient-to-r from-transparent via-[#f5f0e6] to-transparent"></div>
          </div>

          {/* Buttons Section */}
          <div className="w-full space-y-4">
            <Link
              href="/auth"
              className="group block w-full rounded-xl bg-[#1b2a49] px-8 py-4 text-center text-base sm:text-lg font-semibold text-white shadow-md transition-all duration-300 hover:bg-[#2e4e3f] hover:shadow-lg hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#1b2a49] focus:ring-offset-2"
            >
              Get Started
            </Link>

            <Link
              href="/resources"
              className="group block w-full rounded-xl border border-[#1b2a49] bg-white px-8 py-4 text-center text-base sm:text-lg font-semibold text-[#1b2a49] transition-all duration-300 hover:bg-[#f5f0e6] hover:shadow-md hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#1b2a49] focus:ring-offset-2"
            >
              Learn More
            </Link>
          </div>

          {/* Accent Line */}
          <div className="w-full">
            <div className="h-px bg-gradient-to-r from-transparent via-[#2e4e3f]/30 to-transparent"></div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="text-center space-y-2">
          <p className="text-sm sm:text-base text-[#1b2a49]/70 font-medium">
            Test your skills • Compete on the leaderboard • Stay safe online
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <div className="h-1 w-1 rounded-full bg-[#2e4e3f]/40"></div>
            <div className="h-1 w-1 rounded-full bg-[#2e4e3f]/40"></div>
            <div className="h-1 w-1 rounded-full bg-[#2e4e3f]/40"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

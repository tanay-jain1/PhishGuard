'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useProfileContext } from '@/providers/profile-provider';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useProfileContext();

  // Don't show navbar on landing page, auth page, or about page
  if (pathname === '/' || pathname === '/auth' || pathname === '/about') {
    return null;
  }

  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      // Redirect to auth page (or landing page)
      router.push('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
      // Still redirect even if API call fails
      router.push('/auth');
    }
  };

  return (
    <nav className="border-b-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-8">
        <Link href="/" className="text-xl font-bold text-[#1b2a49]">
          PhishGuard
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/play"
            className="text-sm text-[#1b2a49]/70 hover:text-[#1b2a49] font-medium transition-colors"
          >
            Play
          </Link>
          <Link
            href="/leaderboard"
            className="text-sm text-[#1b2a49]/70 hover:text-[#1b2a49] font-medium transition-colors"
          >
            Leaderboard
          </Link>
          <Link
            href="/resources"
            className="text-sm text-[#1b2a49]/70 hover:text-[#1b2a49] font-medium transition-colors"
          >
            Resources
          </Link>
          <Link
            href="/profile"
            className="text-sm text-[#1b2a49]/70 hover:text-[#1b2a49] font-medium transition-colors"
          >
            Profile
          </Link>
          {/* Display points and streak from profile on the right */}
          {!loading && profile && (
            <div className="flex items-center gap-2 text-sm text-[#1b2a49]/70">
              <span>
                Points: <span className="font-semibold text-[#1b2a49]">{profile.points}</span>
              </span>
              <span className="text-[#1b2a49]/50">|</span>
              <span>
                Streak: <span className="font-semibold text-[#1b2a49]">{profile.streak}</span>
              </span>
              {profile.badges && profile.badges.length > 0 && (
                <>
                  <span className="text-[#1b2a49]/50">|</span>
                  <span className="relative" title={`${profile.badges.length} badge${profile.badges.length > 1 ? 's' : ''} earned`}>
                    <span className="text-lg">🏆</span>
                    {profile.badges.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] font-bold text-[#1b2a49]">
                        {profile.badges.length}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-[#1b2a49]/70 hover:text-[#1b2a49] font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Logo() {
  const pathname = usePathname();
  
  if (pathname === '/') return null;

  return (
    <div className="fixed top-2 left-2 z-50">
      <Link href="/about">
        <Image
          src="/logo.png"
          alt="PhishGuard Logo"
          width={160}
          height={160}
          className="rounded-md hover:opacity-90 transition-opacity shadow-md"
          priority
        />
      </Link>
    </div>
  );
}


'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface GuessButtonsProps {
  onGuess: (isPhish: boolean) => void;
  disabled: boolean;
}

export default function GuessButtons({
  onGuess,
  disabled,
}: GuessButtonsProps) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onGuess(true);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onGuess(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onGuess, disabled]);

  return (
    <div className="flex gap-4">
      <Button
        onClick={() => onGuess(false)}
        disabled={disabled}
        variant="outline"
        className="flex-1 border-2 border-green-500 bg-green-50 px-6 py-4 text-lg font-semibold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
      >
        This is Real [R]
      </Button>
      <Button
        onClick={() => onGuess(true)}
        disabled={disabled}
        variant="outline"
        className="flex-1 border-2 border-red-500 bg-red-50 px-6 py-4 text-lg font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
      >
        This is Phish [P]
      </Button>
    </div>
  );
}


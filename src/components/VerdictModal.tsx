'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VerdictModalProps {
  isOpen: boolean;
  isCorrect: boolean;
  pointsDelta: number;
  explanation: string;
  featureFlags: string[];
  onClose: () => void;
  onNext: () => void;
}

export default function VerdictModal({
  isOpen,
  isCorrect,
  pointsDelta,
  explanation,
  featureFlags,
  onNext,
}: VerdictModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">
              {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
            </CardTitle>
            <div
              className={`rounded-full px-4 py-2 text-lg font-semibold ${
                isCorrect
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {pointsDelta > 0 ? `+${pointsDelta}` : '0'} points
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`rounded-lg p-4 ${
              isCorrect
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <p className="text-zinc-900 dark:text-zinc-50">{explanation}</p>
          </div>

          {featureFlags.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Red Flags:
              </h3>
              <div className="flex flex-wrap gap-2">
                {featureFlags.slice(0, 4).map((flag, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={onNext} className="w-full sm:w-auto">
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

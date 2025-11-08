'use client';

import { useEffect } from 'react';

interface VerdictModalProps {
  isOpen: boolean;
  isCorrect: boolean;
  explanation: string;
  redFlags: string[];
  onClose: () => void;
  onNext: () => void;
}

export default function VerdictModal({
  isOpen,
  isCorrect,
  explanation,
  redFlags,
  onClose,
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
      <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <div
            className={`rounded-lg p-4 ${
              isCorrect
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
            }`}
          >
            <p className="text-zinc-900 dark:text-zinc-50">{explanation}</p>
          </div>

          {redFlags.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">
                Red Flags to Look For:
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
                {redFlags.map((flag, index) => (
                  <li key={index}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 px-4 py-2 text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Review
          </button>
          <button
            onClick={onNext}
            className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Next Email
          </button>
        </div>
      </div>
    </div>
  );
}


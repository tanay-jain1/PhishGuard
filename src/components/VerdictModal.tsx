'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VerdictModalProps {
  isOpen: boolean;
  isCorrect: boolean;
  pointsDelta: number;
  explanation: string;
  featureFlags?: string[];
  mlProbPhish?: number;
  mlReasons?: string[];
  mlTokens?: string[];
  onClose: () => void;
  onNext: () => void;
}

export default function VerdictModal({
  isOpen,
  isCorrect,
  pointsDelta,
  explanation,
  featureFlags,
  mlProbPhish,
  mlReasons,
  mlTokens,
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
      <Card className="w-full max-w-2xl border-2 border-[#f5f0e6] bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-[#1b2a49]">
              {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
            </CardTitle>
            <div
              className={`rounded-full px-4 py-2 text-lg font-semibold ${
                isCorrect
                  ? 'bg-[#2e4e3f]/20 text-[#2e4e3f] border-2 border-[#2e4e3f]/30'
                  : 'bg-red-100 text-red-800 border-2 border-red-200'
              }`}
            >
              {pointsDelta > 0 ? `+${pointsDelta}` : '0'} points
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`rounded-xl p-4 ${
              isCorrect
                ? 'bg-[#2e4e3f]/10 border-2 border-[#2e4e3f]/30'
                : 'bg-red-50 border-2 border-red-200'
            }`}
          >
            <p className="text-[#1b2a49] leading-relaxed">{explanation}</p>
          </div>

          {featureFlags && featureFlags.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#1b2a49]">
                Red Flags:
              </h3>
              <div className="flex flex-wrap gap-2">
                {featureFlags.slice(0, 4).map((flag, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-[#f5f0e6] px-3 py-1 text-xs font-medium text-[#1b2a49] border border-[#f5f0e6]"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {mlProbPhish !== undefined && (
            <div className="rounded-xl border-2 border-[#f5f0e6] bg-[#dbeafe]/20 p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#1b2a49]">
                Model Assist
              </h3>
              <div className="mb-3">
                <span className="text-sm text-[#1b2a49]/70">
                  Phishing probability:{' '}
                </span>
                <span className="text-lg font-semibold text-[#1b2a49]">
                  {Math.round(mlProbPhish * 100)}%
                </span>
              </div>
              {mlReasons && mlReasons.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium text-[#1b2a49]/70">
                    Reasons:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-xs text-[#1b2a49]/80">
                    {mlReasons.slice(0, 3).map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {mlTokens && mlTokens.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-[#1b2a49]/70">
                    Features:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mlTokens.slice(0, 3).map((token, index) => (
                      <span
                        key={index}
                        className="rounded bg-[#f5f0e6] px-2 py-0.5 text-xs text-[#1b2a49] border border-[#f5f0e6]"
                      >
                        {token}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="rounded-xl border border-[#1b2a49] bg-white text-[#1b2a49] hover:bg-[#f5f0e6]"
            >
              Review
            </Button>
            <Button
              onClick={onNext}
              className="rounded-xl bg-[#1b2a49] text-white hover:bg-[#2e4e3f] w-full sm:w-auto"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

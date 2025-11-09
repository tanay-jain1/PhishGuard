'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'What is the main goal of a phishing attack?',
    options: [
      'To speed up your computer',
      'To steal personal or financial information',
      'To improve internet security',
      'To send you funny memes',
    ],
    correctAnswer: 1,
  },
  {
    question: 'Which of the following is a common sign of a phishing email?',
    options: [
      'Perfect grammar and spelling',
      'A trusted sender address',
      'Urgent language or threats',
      'Personalized greeting',
    ],
    correctAnswer: 2,
  },
  {
    question: 'What should you do if you receive a suspicious email with a link?',
    options: [
      'Click the link to see what happens',
      'Reply to the sender',
      'Delete or report the email',
      'Forward it to a friend',
    ],
    correctAnswer: 2,
  },
  {
    question: 'Which of these is an example of a phishing message?',
    options: [
      'Your package has shipped!',
      'Your account will be locked unless you verify now!',
      'Reminder: Staff meeting at 3 PM.',
      'Welcome to our newsletter.',
    ],
    correctAnswer: 1,
  },
  {
    question: 'What type of website might a phishing link take you to?',
    options: [
      'A secure banking site',
      'A fake website that looks real',
      'A news article',
      'A weather forecast',
    ],
    correctAnswer: 1,
  },
  {
    question: 'Which part of an email should you always double-check to spot phishing?',
    options: [
      'Font style',
      "Sender's email address",
      'Color theme',
      'Signature image',
    ],
    correctAnswer: 1,
  },
  {
    question: 'What is "spear phishing"?',
    options: [
      'Fishing with a spear',
      'A targeted phishing attack aimed at one person or group',
      'A type of antivirus software',
      'A password recovery method',
    ],
    correctAnswer: 1,
  },
  {
    question: "What does a padlock icon in your browser's address bar mean?",
    options: [
      'The website is 100% safe',
      'The site uses encryption, but still might be fake',
      'The site is slow',
      'The site is government-approved',
    ],
    correctAnswer: 1,
  },
  {
    question: 'If a message says "You\'ve won a prize!", what should you do first?',
    options: [
      'Give your credit card to claim it',
      'Click the link immediately',
      'Verify if it\'s from a legitimate source',
      'Reply "Thank you"',
    ],
    correctAnswer: 2,
  },
  {
    question: 'Which of these actions helps you avoid phishing scams?',
    options: [
      'Using strong, unique passwords',
      'Sharing passwords by text',
      'Clicking all promotional links',
      'Ignoring software updates',
    ],
    correctAnswer: 0,
  },
];

interface VerdictModalProps {
  isOpen: boolean;
  isCorrect: boolean;
  pointsDelta: number;
  explanation: string;
  featureFlags: string[];
  mlProbPhish?: number;
  mlReasons?: string[];
  mlTokens?: string[];
  showRecapQuiz?: boolean;
  onClose: () => void;
  onNext: () => void;
  onQuizComplete?: () => void;
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
  showRecapQuiz = false,
  onClose,
  onNext,
  onQuizComplete,
}: VerdictModalProps) {
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);

  const currentQuiz = useMemo(() => {
    return QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];
  }, [showRecapQuiz]);

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

  useEffect(() => {
    if (showRecapQuiz && isOpen) {
      setSelectedQuizAnswer(null);
      setQuizAnswered(false);
      setQuizCorrect(false);
    }
  }, [showRecapQuiz, isOpen]);

  const handleQuizAnswer = (answerIndex: number) => {
    if (quizAnswered) return;
    setSelectedQuizAnswer(answerIndex);
    const isCorrect = answerIndex === currentQuiz.correctAnswer;
    setQuizCorrect(isCorrect);
    setQuizAnswered(true);
    if (onQuizComplete) {
      onQuizComplete();
    }
  };

  const canProceed = !showRecapQuiz || quizAnswered;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl border-2 border-[#f5f0e6] bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-[#1b2a49]">
              {isCorrect ? 'Correct!' : 'Incorrect'}
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

          {featureFlags.length > 0 && (
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

          {showRecapQuiz && !isCorrect && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-[#f5f0e6] bg-[#f5f0e6]/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1b2a49]/10">
                    <svg
                      className="h-3 w-3 text-[#1b2a49]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="mb-3 text-sm leading-relaxed text-[#1b2a49]">
                      Looks like you've missed a few in a row — take a quick recap to strengthen your phishing awareness!
                    </p>
                    <div className="space-y-2">
                      <a
                        href="https://www.youtube.com/watch?v=sg0kQYvTlnc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-medium text-[#1b2a49] underline hover:text-[#2e4e3f] transition-colors"
                      >
                        Watch: Phishing Awareness Video 1
                      </a>
                      <a
                        href="https://www.youtube.com/watch?v=fow7C_0EoRs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm font-medium text-[#1b2a49] underline hover:text-[#2e4e3f] transition-colors"
                      >
                        Watch: Phishing Awareness Video 2
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-[#dbeafe] bg-[#dbeafe]/30 p-4">
                <h3 className="mb-4 text-base font-semibold text-[#1b2a49]">
                  Quick Quiz Question
                </h3>
                <p className="mb-4 text-sm font-medium text-[#1b2a49]">
                  {currentQuiz.question}
                </p>
                <div className="space-y-2">
                  {currentQuiz.options.map((option, index) => {
                    const isSelected = selectedQuizAnswer === index;
                    const isCorrectAnswer = index === currentQuiz.correctAnswer;
                    const showFeedback = quizAnswered;

                    let optionClass = 'w-full rounded-lg border-2 p-3 text-left text-sm transition-all cursor-pointer ';
                    if (showFeedback) {
                      if (isCorrectAnswer) {
                        optionClass += 'border-[#2e4e3f] bg-[#2e4e3f]/10 text-[#1b2a49]';
                      } else if (isSelected && !isCorrectAnswer) {
                        optionClass += 'border-red-300 bg-red-50 text-[#1b2a49]';
                      } else {
                        optionClass += 'border-[#f5f0e6] bg-white text-[#1b2a49]/70';
                      }
                    } else {
                      optionClass += isSelected
                        ? 'border-[#1b2a49] bg-[#1b2a49]/5 text-[#1b2a49]'
                        : 'border-[#f5f0e6] bg-white text-[#1b2a49] hover:border-[#1b2a49]/50 hover:bg-[#f5f0e6]';
                    }

                    return (
                      <label
                        key={index}
                        className={optionClass}
                        onClick={() => !quizAnswered && handleQuizAnswer(index)}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="quiz-answer"
                            checked={isSelected}
                            onChange={() => {}}
                            disabled={quizAnswered}
                            className="h-4 w-4 cursor-pointer text-[#1b2a49]"
                          />
                          <span>{option}</span>
                          {showFeedback && isCorrectAnswer && (
                            <span className="ml-auto text-[#2e4e3f] font-semibold">(Correct)</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                {quizAnswered && (
                  <div className={`mt-4 rounded-lg p-3 ${quizCorrect ? 'bg-[#2e4e3f]/10 border-2 border-[#2e4e3f]/30' : 'bg-red-50 border-2 border-red-200'}`}>
                    <p className={`text-sm font-medium ${quizCorrect ? 'text-[#2e4e3f]' : 'text-red-800'}`}>
                      {quizCorrect
                        ? 'Correct!'
                        : `Incorrect. The correct answer is: ${currentQuiz.options[currentQuiz.correctAnswer]}`}
                    </p>
                  </div>
                )}
              </div>
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
              disabled={!canProceed}
              className="rounded-xl bg-[#1b2a49] text-white hover:bg-[#2e4e3f] w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Question
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

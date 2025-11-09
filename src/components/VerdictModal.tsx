'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getBadgeById, BADGES } from '@/lib/badges';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
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
    explanation: 'Phishing attacks are designed to trick you into revealing sensitive information like passwords, credit card numbers, or personal data. Attackers use deceptive emails and websites to steal this information.',
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
    explanation: 'Phishing emails often use urgent language, threats, or create a sense of panic to pressure you into acting quickly without thinking. Legitimate companies rarely use such tactics.',
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
    explanation: 'The safest action is to delete or report suspicious emails. Never click links or reply to suspicious emails, as this can confirm your email address is active and lead to more attacks.',
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
    explanation: 'Messages that threaten account lockout or use urgent language to pressure immediate action are classic phishing tactics. Legitimate companies don\'t threaten to lock accounts via email.',
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
    explanation: 'Phishing links often lead to fake websites designed to look like legitimate sites (banks, social media, etc.) to trick you into entering your credentials.',
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
    explanation: 'Always check the sender\'s email address carefully. Phishing emails often use similar-looking domains (e.g., "amazon-verify.com" instead of "amazon.com") to trick you.',
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
    explanation: 'Spear phishing is a targeted attack where the attacker researches their victim and creates personalized, convincing emails. It\'s more dangerous than generic phishing because it\'s tailored to the victim.',
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
    explanation: 'A padlock only means the connection is encrypted (HTTPS), not that the site is legitimate. Phishing sites can also use HTTPS, so always verify the domain name matches the real company.',
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
    explanation: 'Always verify the legitimacy of prize notifications. Legitimate contests don\'t ask for payment or personal information upfront. If it seems too good to be true, it probably is.',
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
    explanation: 'Using strong, unique passwords for each account helps protect you even if one account is compromised. Never share passwords, and be cautious with links and updates.',
  },
];

interface VerdictModalProps {
  isOpen: boolean;
  isCorrect: boolean;
  pointsDelta: number;
  explanation: string;
  featureFlags?: string[];
  mlProbPhish?: number;
  mlReasons?: string[];
  mlTokens?: string[];
  showRecapQuiz?: boolean;
  consecutiveWrongs?: number;
  unlockedBadges?: string[];
  isPhish?: boolean; // Actual answer from database
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
  consecutiveWrongs = 0,
  unlockedBadges,
  isPhish,
  onClose,
  onNext,
  onQuizComplete,
}: VerdictModalProps) {
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizExplanationShown, setQuizExplanationShown] = useState(false);

  // Show quiz after every wrong answer
  const showQuiz = !isCorrect;
  // Show embedded video after 3 consecutive wrong answers
  const showVideo = consecutiveWrongs >= 3 && !isCorrect;

  const currentQuiz = useMemo(() => {
    return QUIZ_QUESTIONS[Math.floor(Math.random() * QUIZ_QUESTIONS.length)];
  }, [isOpen, !isCorrect]);

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
    if (isOpen && !isCorrect) {
      setSelectedQuizAnswer(null);
      setQuizAnswered(false);
      setQuizCorrect(false);
      setQuizExplanationShown(false);
    }
  }, [isOpen, isCorrect]);

  const handleQuizAnswer = (answerIndex: number) => {
    if (quizAnswered) return;
    setSelectedQuizAnswer(answerIndex);
    const isCorrectAnswer = answerIndex === currentQuiz.correctAnswer;
    setQuizCorrect(isCorrectAnswer);
    setQuizAnswered(true);
    // Show explanation immediately (no delay needed)
    setQuizExplanationShown(true);
  };

  // Allow proceeding if no quiz is shown, or if quiz is answered
  // Also allow if video is shown (video doesn't require quiz answer)
  const canProceed = !showQuiz || showVideo || quizAnswered;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="flex h-[90vh] max-h-[800px] w-full max-w-2xl flex-col border-2 border-[#f5f0e6] bg-white/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="shrink-0">
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
              {pointsDelta > 0 ? `+${pointsDelta}` : pointsDelta} points
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto">
          <div
            className={`rounded-xl p-4 ${
              isCorrect
                ? 'bg-[#2e4e3f]/10 border-2 border-[#2e4e3f]/30'
                : 'bg-red-50 border-2 border-red-200'
            }`}
          >
            <p className="text-[#1b2a49] leading-relaxed">{explanation}</p>
          </div>

          {unlockedBadges && unlockedBadges.length > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 p-4 animate-pulse">
              <div className="flex items-center justify-center mb-2">
                <span className="text-4xl animate-bounce">🎉</span>
              </div>
              <h3 className="mb-3 text-sm font-semibold text-[#1b2a49] flex items-center justify-center gap-2">
                <span className="text-xl">🏆</span>
                New Badge{unlockedBadges.length > 1 ? 's' : ''} Unlocked!
              </h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {unlockedBadges.map((badgeId, index) => {
                  const badge = getBadgeById(badgeId);
                  if (!badge) return null;
                  return (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-full bg-yellow-200 px-4 py-2 text-sm font-semibold text-[#1b2a49] border-2 border-yellow-400 shadow-sm"
                    >
                      <span>{badge.icon}</span>
                      <span>{badge.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

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

          {mlProbPhish !== undefined && 
           ((mlReasons && mlReasons.length > 0) || (mlTokens && mlTokens.length > 0)) && (
            <div className="rounded-xl border-2 border-[#f5f0e6] bg-[#dbeafe]/20 p-4">
              <h3 className="mb-2 text-sm font-semibold text-[#1b2a49]">
                Model Assist
              </h3>
              <div className="mb-3">
                {(() => {
                  // Determine if email is actually phishing (explicit boolean check)
                  // Handle boolean, undefined, or null values
                  if (isPhish === true) {
                    // Email is actually phishing - show phishing probability
                    return (
                      <>
                        <span className="text-sm text-[#1b2a49]/70">
                          Phishing probability:{' '}
                        </span>
                        <span className="text-lg font-semibold text-[#1b2a49]">
                          {Math.round(mlProbPhish * 100)}%
                        </span>
                      </>
                    );
                  } else if (isPhish === false) {
                    // Email is actually real - show "not phishing" probability (inverted)
                    // If model says 90% phishing, show "Not phishing: 10%"
                    const notPhishingProb = Math.round((1 - mlProbPhish) * 100);
                    return (
                      <>
                        <span className="text-sm text-[#1b2a49]/70">
                          Not phishing:{' '}
                        </span>
                        <span className="text-lg font-semibold text-[#1b2a49]">
                          {notPhishingProb}%
                        </span>
                      </>
                    );
                  } else {
                    // Fallback if isPhish is undefined/null - show raw probability
                    return (
                      <>
                        <span className="text-sm text-[#1b2a49]/70">
                          Phishing probability:{' '}
                        </span>
                        <span className="text-lg font-semibold text-[#1b2a49]">
                          {Math.round(mlProbPhish * 100)}%
                        </span>
                      </>
                    );
                  }
                })()}
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

          {/* Show embedded video after 3 consecutive wrong answers */}
          {showVideo && (
            <div className="rounded-xl border-2 border-[#f5f0e6] bg-[#f5f0e6]/50 p-4">
              <div className="flex items-start gap-3 mb-4">
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
                  <p className="mb-3 text-sm leading-relaxed text-[#1b2a49] font-medium">
                    Looks like you've missed a few in a row — take a quick recap to strengthen your phishing awareness!
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-[#1b2a49]/70">Phishing Awareness Video 1</p>
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      src="https://www.youtube.com/embed/sg0kQYvTlnc"
                      title="Phishing Awareness Video 1"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show quiz after every wrong answer (but not if video is showing) */}
          {showQuiz && !showVideo && (
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
                          <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                            <input
                              type="radio"
                              name="quiz-answer"
                              checked={isSelected}
                              onChange={() => {}}
                              disabled={quizAnswered}
                              className="h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-[#1b2a49]/30 bg-transparent text-[#1b2a49] focus:ring-2 focus:ring-[#1b2a49] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                              style={{
                                cursor: quizAnswered ? 'not-allowed' : 'pointer',
                                backgroundColor: isSelected ? '#1b2a49' : 'transparent',
                                backgroundImage: isSelected ? 'radial-gradient(circle, white 35%, transparent 35%)' : 'none',
                              }}
                            />
                            {showFeedback && isCorrectAnswer && (
                              <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#2e4e3f] border-2 border-white shadow-sm" />
                            )}
                          </div>
                          <span className="flex-1 text-sm">{option}</span>
                          {showFeedback && isCorrectAnswer && (
                            <span className="ml-auto text-[#2e4e3f] font-semibold text-sm">(Correct)</span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
                {quizAnswered && (
                  <div className={`mt-4 rounded-lg p-4 ${quizCorrect ? 'bg-[#2e4e3f]/10 border-2 border-[#2e4e3f]/30' : 'bg-red-50 border-2 border-red-200'}`}>
                    <p className={`text-sm font-semibold mb-2 ${quizCorrect ? 'text-[#2e4e3f]' : 'text-red-800'}`}>
                      {quizCorrect
                        ? '✓ Correct!'
                        : `✗ Incorrect. The correct answer is: "${currentQuiz.options[currentQuiz.correctAnswer]}"`}
                    </p>
                    <p className={`text-sm leading-relaxed ${quizCorrect ? 'text-[#1b2a49]' : 'text-red-700'}`}>
                      {currentQuiz.explanation}
                    </p>
                  </div>
                )}
            </div>
          )}

        </CardContent>
        <div className="shrink-0 border-t border-[#f5f0e6] bg-white/95 p-4">
          <div className="flex justify-end gap-3">
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
        </div>
      </Card>
    </div>
  );
}

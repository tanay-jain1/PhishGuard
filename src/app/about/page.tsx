'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const [consentChecked, setConsentChecked] = useState(false);
  const router = useRouter();

  const handleContinue = () => {
    if (consentChecked) {
      router.push('/play');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#dbeafe]">
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-8">
          {/* Section 1: What is Phishing */}
          <section className="rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-8 shadow-md">
            <h2 className="mb-4 text-3xl font-bold text-[#1b2a49]">
              What is Phishing?
            </h2>
            <p className="mb-6 text-lg leading-relaxed text-[#1b2a49]/90">
              Phishing is a type of cyber attack where criminals attempt to trick you into revealing sensitive information—like passwords, credit card numbers, or personal data—by sending deceptive emails or messages that appear to come from legitimate sources. These attacks often use urgency, fear, or curiosity to manipulate victims into clicking malicious links or sharing confidential information.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#2e4e3f]"></div>
                <p className="text-base text-[#1b2a49]/80">
                  <span className="font-semibold">Over 90% of data breaches start with a phishing email.</span> (Verizon DBIR)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#2e4e3f]"></div>
                <p className="text-base text-[#1b2a49]/80">
                  <span className="font-semibold">Phishing attacks increased by over 60% in the past year.</span> As cybercriminals become more sophisticated, these attacks continue to evolve.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[#2e4e3f]"></div>
                <p className="text-base text-[#1b2a49]/80">
                  <span className="font-semibold">Nearly 1 in 4 people click on a phishing link each year.</span> Education and awareness are crucial for protection.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Why We Built PhishGuard */}
          <section className="rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-8 shadow-md">
            <h2 className="mb-4 text-3xl font-bold text-[#1b2a49]">
              Why We Built PhishGuard
            </h2>
            <p className="mb-4 text-lg leading-relaxed text-[#1b2a49]/90">
              PhishGuard was created to help you learn to recognize phishing attempts through interactive simulations. We believe that hands-on practice in a safe environment is the most effective way to build the skills needed to identify and avoid real-world phishing attacks.
            </p>
            <p className="mb-4 text-lg leading-relaxed text-[#1b2a49]/90">
              Our platform encourages safe online behavior with immediate feedback and gamified learning experiences. By making cybersecurity education engaging and accessible, we aim to contribute to a safer digital community where everyone can navigate the internet with confidence.
            </p>
            <p className="text-lg leading-relaxed text-[#1b2a49]/90">
              Through realistic scenarios and detailed explanations, PhishGuard transforms cybersecurity awareness from a chore into an empowering skill that protects you, your data, and your digital identity.
            </p>
          </section>

          {/* Section 3: Why Internet Safety Matters */}
          <section className="rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-8 shadow-md">
            <h2 className="mb-4 text-3xl font-bold text-[#1b2a49]">
              Why Internet Safety Matters
            </h2>
            <p className="text-lg leading-relaxed text-[#1b2a49]/90">
              In today's digital world, protecting your personal information and online identity is more important than ever. With scams evolving faster than ever, education is the best defense. Every click, every email, and every interaction online carries potential risks—but with the right knowledge and awareness, you can navigate the digital landscape safely and confidently. By learning to recognize phishing attempts and other cyber threats, you're not just protecting yourself; you're contributing to a more secure internet for everyone.
            </p>
          </section>

          {/* Section 4: User Consent */}
          <section className="rounded-2xl border-2 border-[#f5f0e6] bg-white/80 backdrop-blur-sm p-8 shadow-md">
            <h2 className="mb-6 text-3xl font-bold text-[#1b2a49]">
              Ready to Start Learning?
            </h2>
            <div className="mb-6 rounded-xl border-2 border-[#dbeafe] bg-[#dbeafe]/30 p-6">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-1 h-5 w-5 cursor-pointer rounded border-2 border-[#1b2a49] text-[#2e4e3f] focus:ring-2 focus:ring-[#2e4e3f] focus:ring-offset-2"
                />
                <label
                  htmlFor="consent"
                  className="flex-1 cursor-pointer text-base leading-relaxed text-[#1b2a49]"
                >
                  I understand that PhishGuard is a training tool that may display simulated phishing emails. None of my personal data will be collected or shared.
                </label>
              </div>
            </div>
            <button
              onClick={handleContinue}
              disabled={!consentChecked}
              className={`w-full rounded-xl px-6 py-4 font-semibold text-white transition-all duration-300 shadow-md ${
                consentChecked
                  ? 'bg-[#1b2a49] hover:bg-[#2e4e3f] hover:shadow-lg cursor-pointer'
                  : 'bg-[#1b2a49]/50 cursor-not-allowed'
              }`}
            >
              Continue to Simulator
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}


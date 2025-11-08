/**
 * Email Phishing Heuristics Analyzer
 * 
 * Usage Examples:
 * 
 * // Example 1: Obvious phishing email
 * const result1 = analyzeEmail({
 *   subject: "URGENT: Verify Your Account Now!",
 *   body_html: "Click here: http://amazon-verify.com/login",
 *   from_email: "security@amazon-verify.com",
 *   from_name: "Amazon Security"
 * });
 * // Returns: { phishScore: 8, difficulty: 3, flags: [...] }
 * 
 * // Example 2: Legitimate email
 * const result2 = analyzeEmail({
 *   subject: "Your Order #12345 Has Shipped",
 *   body_html: "Your order has shipped. Track at https://www.amazon.com/orders",
 *   from_email: "noreply@amazon.com",
 *   from_name: "Amazon"
 * });
 * // Returns: { phishScore: 0, difficulty: 1, flags: [] }
 * 
 * // Example 3: Suspicious but subtle
 * const result3 = analyzeEmail({
 *   subject: "Payment Required",
 *   body_html: "Please update your payment method at bit.ly/payment-update",
 *   from_email: "billing@microsoft-support.net",
 *   from_name: "Microsoft"
 * });
 * // Returns: { phishScore: 5, difficulty: 2, flags: [...] }
 */

export type HeuristicResult = {
  flags: Array<{ key: string; label: string; detail?: string; weight: number }>;
  flagKeys: string[];
  phishScore: number; // sum of weights
  difficulty: 1 | 2 | 3; // Easy=1 (1–2), Medium=2 (3–5), Hard=3 (>=6)
  topReasons: Array<{ key: string; label: string; weight: number; detail?: string }>;
};

export function analyzeEmail(input: {
  subject: string;
  body_html: string;
  from_email?: string | null;
  from_name?: string | null;
}): HeuristicResult {
  const flags: HeuristicResult['flags'] = [];
  const { subject, body_html, from_email, from_name } = input;

  // Sender Clues
  // 1. Public domain sender (gmail.com, yahoo.com, etc.)
  if (from_email) {
    const publicDomains = /@(gmail|yahoo|hotmail|outlook|aol|icloud|protonmail|mail)\.(com|net|org)/i;
    if (publicDomains.test(from_email)) {
      flags.push({
        key: 'public_domain_sender',
        label: 'Public email domain',
        detail: `Sender uses a public email domain: ${from_email}`,
        weight: 1,
      });
    }

    // 2. Domain misspelling (amazon-verify.com, microsoft-support.net, etc.)
    const suspiciousPatterns = /[-_](verify|support|security|billing|account|update|secure|official)/i;
    if (suspiciousPatterns.test(from_email)) {
      flags.push({
        key: 'domain_misspelling',
        label: 'Suspicious domain pattern',
        detail: `Domain contains suspicious patterns: ${from_email}`,
        weight: 3,
      });
    }

    // 3. Sender not matching brand (if from_name suggests a brand)
    if (from_name) {
      const brandNames = ['amazon', 'microsoft', 'apple', 'google', 'netflix', 'paypal', 'bank', 'github'];
      const fromNameLower = from_name.toLowerCase();
      const fromEmailLower = from_email.toLowerCase();
      
      for (const brand of brandNames) {
        if (fromNameLower.includes(brand) && !fromEmailLower.includes(brand)) {
          flags.push({
            key: 'sender_not_matching_brand',
            label: 'Brand name mismatch',
            detail: `Sender name mentions "${brand}" but email domain doesn't match`,
            weight: 2,
          });
          break;
        }
      }
    }
  }

  // Content/Tone
  // 1. Spelling/grammar issues
  const commonMisspellings = /\b(acount|acess|recieve|securty|verifiy|immediatly|urgent|suspended|locked|expired)\b/i;
  if (commonMisspellings.test(subject + ' ' + body_html)) {
    flags.push({
      key: 'spelling_grammar_issues',
      label: 'Spelling or grammar errors',
      detail: 'Contains common misspellings or grammar mistakes',
      weight: 1,
    });
  }

  // 2. Urgent language
  const urgentPatterns = /\b(urgent|immediately|asap|right now|expires? today|within 24 hours?|act now|verify now|suspended|locked|expired|terminated)\b/i;
  if (urgentPatterns.test(subject + ' ' + body_html)) {
    flags.push({
      key: 'urgent_language',
      label: 'Urgent or threatening language',
      detail: 'Uses urgent or time-sensitive language',
      weight: 2,
    });
  }

  // 3. Tone mismatch (formal company name but casual tone, or vice versa)
  const casualTone = /\b(hey|hi there|yo|dude|gotta|wanna|gonna)\b/i;
  const formalBrand = /\b(amazon|microsoft|apple|google|netflix|paypal|bank|financial)\b/i;
  if (casualTone.test(body_html) && formalBrand.test(subject + ' ' + body_html)) {
    flags.push({
      key: 'tone_mismatch',
      label: 'Tone mismatch',
      detail: 'Casual tone doesn\'t match formal brand communication',
      weight: 2,
    });
  }

  // Links/Attachments
  // 1. Anchor text mismatch (link text doesn't match URL)
  const anchorMismatch = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
  let anchorMatch;
  while ((anchorMatch = anchorMismatch.exec(body_html)) !== null) {
    const url = anchorMatch[1];
    const anchorText = anchorMatch[2].toLowerCase();
    const urlLower = url.toLowerCase();
    
    // Check if anchor text suggests a domain but URL is different
    if (anchorText.includes('amazon') && !urlLower.includes('amazon.com')) {
      flags.push({
        key: 'anchor_mismatch',
        label: 'Link text mismatch',
        detail: `Link text mentions "amazon" but URL points elsewhere: ${url}`,
        weight: 3,
      });
    } else if (anchorText.includes('microsoft') && !urlLower.includes('microsoft.com')) {
      flags.push({
        key: 'anchor_mismatch',
        label: 'Link text mismatch',
        detail: `Link text mentions "microsoft" but URL points elsewhere: ${url}`,
        weight: 3,
      });
    } else if (anchorText.includes('click here') || anchorText.includes('here')) {
      // Generic "click here" is suspicious
      if (!urlLower.includes('http') || urlLower.includes('bit.ly') || urlLower.includes('tinyurl')) {
        flags.push({
          key: 'anchor_mismatch',
          label: 'Generic link text',
          detail: `Generic "click here" link: ${url}`,
          weight: 3,
        });
      }
    }
  }

  // 2. Shortened links
  const shortenedLinkPatterns = /(bit\.ly|tinyurl|t\.co|goo\.gl|short\.link|ow\.ly|is\.gd|buff\.ly)/i;
  if (shortenedLinkPatterns.test(body_html)) {
    flags.push({
      key: 'shortened_link',
      label: 'Shortened URL',
      detail: 'Contains shortened URL (bit.ly, tinyurl, etc.)',
      weight: 2,
    });
  }

  // 3. HTTP not HTTPS
  const httpLinks = /https?:\/\/([^\s"']+)/gi;
  let httpMatch;
  while ((httpMatch = httpLinks.exec(body_html)) !== null) {
    if (httpMatch[0].startsWith('http://') && !httpMatch[0].startsWith('http://localhost')) {
      flags.push({
        key: 'http_not_https',
        label: 'Insecure HTTP link',
        detail: `Link uses HTTP instead of HTTPS: ${httpMatch[0]}`,
        weight: 2,
      });
      break; // Only flag once
    }
  }
  }

  // 4. Unexpected attachment mentions
  const attachmentPatterns = /\b(attachment|download|open|view|scan|virus|malware|invoice|document|file)\s+(attached|below|here|enclosed)\b/i;
  if (attachmentPatterns.test(body_html)) {
    flags.push({
      key: 'unexpected_attachment',
      label: 'Mentions attachments',
      detail: 'Email mentions attachments or files to download',
      weight: 3,
    });
  }

  // Security Pressure
  // 1. Asks for credentials
  const credentialPatterns = /\b(password|username|login|credentials|account\s+details?|social\s+security|ssn|pin|credit\s+card|bank\s+account)\b/i;
  if (credentialPatterns.test(body_html)) {
    flags.push({
      key: 'asks_for_credentials',
      label: 'Requests sensitive information',
      detail: 'Asks for passwords, SSN, or other sensitive credentials',
      weight: 3,
    });
  }

  // 2. Asks for payment
  const paymentPatterns = /\b(pay\s+now|payment\s+required|overdue|invoice|amount\s+due|credit\s+card|wire\s+transfer|bitcoin|crypto)\b/i;
  if (paymentPatterns.test(subject + ' ' + body_html)) {
    flags.push({
      key: 'asks_for_payment',
      label: 'Payment request',
      detail: 'Requests payment or financial information',
      weight: 3,
    });
  }

  // 3. Threatens negative consequences
  const threatPatterns = /\b(suspended|locked|closed|terminated|deleted|expired|legal\s+action|lawsuit|arrest|warrant)\b/i;
  if (threatPatterns.test(subject + ' ' + body_html)) {
    flags.push({
      key: 'threatens_negative_consequences',
      label: 'Threatening language',
      detail: 'Threatens account suspension, legal action, or other consequences',
      weight: 3,
    });
  }

  // Calculate phishScore
  const phishScore = flags.reduce((sum, flag) => sum + flag.weight, 0);

  // Determine difficulty
  let difficulty: 1 | 2 | 3;
  if (phishScore <= 2) {
    difficulty = 1; // Easy
  } else if (phishScore <= 5) {
    difficulty = 2; // Medium
  } else {
    difficulty = 3; // Hard
  }

  // Get top reasons (top 2-4 flags by weight)
  const sortedFlags = [...flags].sort((a, b) => b.weight - a.weight);
  const topReasons = sortedFlags.slice(0, Math.min(4, Math.max(2, sortedFlags.length))).map(flag => ({
    key: flag.key,
    label: flag.label,
    weight: flag.weight,
    detail: flag.detail,
  }));

  // Get flag keys
  const flagKeys = flags.map(flag => flag.key);

  return {
    flags,
    flagKeys,
    phishScore,
    difficulty,
    topReasons,
  };
}


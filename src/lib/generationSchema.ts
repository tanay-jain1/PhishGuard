/**
 * Generation Schema and Normalization
 * 
 * Provides Zod schema validation and normalization/scoring for generated emails.
 * Ensures data quality and computes missing features/difficulty using heuristics.
 */

import { z } from 'zod';
import { analyzeEmail } from './heuristics';
import type { HeuristicResult } from './heuristics';

/**
 * Zod schema for GeneratedEmail
 */
export const GeneratedEmailSchema = z.object({
  subject: z.string().min(1),
  from_name: z.string().min(1),
  from_email: z.string().email(),
  body_html: z.string().min(1),
  is_phish: z.boolean(),
  explanation: z.string().min(1),
  features: z.array(z.string()).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export type GeneratedEmail = z.infer<typeof GeneratedEmailSchema>;

/**
 * Maximum lengths for string fields to prevent overly long content
 */
const MAX_LENGTHS = {
  subject: 200,
  from_name: 100,
  from_email: 255,
  explanation: 1000,
  body_html: 50000, // HTML can be longer but still reasonable
} as const;

/**
 * Sanitize HTML to remove external images, scripts, and other potentially unsafe content
 */
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags (keep inline styles in tags, but remove style blocks)
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove external image sources (keep data URIs and relative paths)
  // Replace img src attributes that point to external URLs (http:// or https:// with domain)
  html = html.replace(/<img([^>]*)\ssrc=["'](https?:\/\/[^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    // Keep relative URLs and data URIs, remove external ones
    if (src.startsWith('data:') || src.startsWith('/') || !src.includes('://')) {
      return match;
    }
    // Remove external image
    return '';
  });
  
  // Remove iframe tags (often used for tracking/embedding)
  html = html.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  
  // Remove object/embed tags
  html = html.replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '');
  html = html.replace(/<embed[^>]*>/gi, '');
  
  // Remove on* event handlers (onclick, onload, etc.)
  html = html.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');
  
  return html.trim();
}

/**
 * Trim string to maximum length, adding ellipsis if truncated
 */
function trimString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Normalize and score a generated email
 * 
 * - Validates and trims string fields
 * - Sanitizes HTML (removes scripts, external images, etc.)
 * - Computes missing features/difficulty using heuristics
 * - Ensures difficulty is always 1, 2, or 3
 * - Returns normalized email with guaranteed features and difficulty
 */
export function normalizeAndScore(item: GeneratedEmail): GeneratedEmail & { features: string[]; difficulty: 1 | 2 | 3 } {
  // 1. Trim string fields to reasonable lengths
  const normalized: GeneratedEmail = {
    subject: trimString(item.subject, MAX_LENGTHS.subject),
    from_name: trimString(item.from_name, MAX_LENGTHS.from_name),
    from_email: trimString(item.from_email, MAX_LENGTHS.from_email).toLowerCase().trim(),
    body_html: sanitizeHtml(trimString(item.body_html, MAX_LENGTHS.body_html)),
    is_phish: item.is_phish,
    explanation: trimString(item.explanation, MAX_LENGTHS.explanation),
    features: item.features,
    difficulty: item.difficulty,
  };

  // 2. Determine if we need to run heuristics
  const needsFeatures = !normalized.features || normalized.features.length === 0;
  const needsDifficulty = !normalized.difficulty || ![1, 2, 3].includes(normalized.difficulty);
  const needsHeuristics = needsFeatures || needsDifficulty;

  // 3. Run heuristics once if needed
  let heuristicResult: HeuristicResult | null = null;
  if (needsHeuristics) {
    heuristicResult = analyzeEmail({
      subject: normalized.subject,
      body_html: normalized.body_html,
      from_email: normalized.from_email,
      from_name: normalized.from_name,
    });
  }

  // 4. Use heuristics if features are missing or empty
  let features: string[] = normalized.features || [];
  if (features.length === 0) {
    if (heuristicResult) {
      features = heuristicResult.topReasons.map(r => r.label);
    } else {
      // Safety fallback: run heuristics if somehow we don't have a result
      const fallbackHeuristics = analyzeEmail({
        subject: normalized.subject,
        body_html: normalized.body_html,
        from_email: normalized.from_email,
        from_name: normalized.from_name,
      });
      features = fallbackHeuristics.topReasons.map(r => r.label);
      if (!heuristicResult) {
        heuristicResult = fallbackHeuristics;
      }
    }
  }

  // 5. Use heuristics if difficulty is missing, and ensure it's 1, 2, or 3
  let difficulty: 1 | 2 | 3;
  if (normalized.difficulty && [1, 2, 3].includes(normalized.difficulty)) {
    difficulty = normalized.difficulty;
  } else if (heuristicResult) {
    difficulty = heuristicResult.difficulty;
  } else {
    // This should never happen, but safety fallback
    difficulty = 2; // Default to medium
  }

  // 6. Ensure difficulty is always 1, 2, or 3 (safety check)
  if (![1, 2, 3].includes(difficulty)) {
    difficulty = 2; // Default to medium
  }

  // 7. Return normalized email with guaranteed features and difficulty
  return {
    ...normalized,
    features,
    difficulty: difficulty as 1 | 2 | 3,
  };
}


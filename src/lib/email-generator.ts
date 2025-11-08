/**
 * Email Generator Service
 * Uses AWS Bedrock (Claude 3.5 Haiku) to generate realistic email samples
 * Falls back to mock generator if Bedrock is not configured
 * 
 * This module wraps the bedrock LLM module and adds validation/enrichment
 */

import { generateEmails as bedrockGenerateEmails, hasBedrock, bedrockGenerateEmails as bedrockGenerate, bedrockMockGenerateEmails, type GeneratedEmail as BedrockGeneratedEmail } from './llm/bedrock';
import { analyzeEmail } from './heuristics';
import type { HeuristicResult } from './heuristics';

export interface GeneratedEmail {
  subject: string;
  from_name: string;
  from_email: string;
  body_html: string;
  is_phish: boolean;
  features?: string[];
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface EmailGeneratorResult {
  emails: GeneratedEmail[];
  source: 'bedrock' | 'mock';
  errors?: string[];
}

/**
 * Convert bedrock email format (difficulty: 1|2|3) to database format (difficulty: 'easy'|'medium'|'hard')
 */
function convertBedrockEmailToDbFormat(bedrockEmail: BedrockGeneratedEmail): GeneratedEmail {
  const difficultyMap: Record<1 | 2 | 3, 'easy' | 'medium' | 'hard'> = {
    1: 'easy',
    2: 'medium',
    3: 'hard',
  };

  return {
    subject: bedrockEmail.subject,
    from_name: bedrockEmail.from_name,
    from_email: bedrockEmail.from_email,
    body_html: bedrockEmail.body_html,
    is_phish: bedrockEmail.is_phish,
    features: bedrockEmail.features,
    explanation: bedrockEmail.explanation,
    difficulty: bedrockEmail.difficulty ? difficultyMap[bedrockEmail.difficulty] : undefined,
  };
}

/**
 * Validate and enrich generated email with heuristics if needed
 */
function validateAndEnrichEmail(email: GeneratedEmail): GeneratedEmail {
  // Validate required fields
  if (!email.subject || !email.from_name || !email.from_email || !email.body_html || typeof email.is_phish !== 'boolean') {
    throw new Error('Invalid email: missing required fields');
  }

  // Run heuristics to compute features and difficulty
  const heuristicResult: HeuristicResult = analyzeEmail({
    subject: email.subject,
    body_html: email.body_html,
    from_email: email.from_email,
    from_name: email.from_name,
  });

  // If model didn't provide features or difficulty, use heuristics
  if (!email.features || email.features.length === 0) {
    email.features = heuristicResult.topReasons.map(r => r.label);
  }

  // If model didn't provide difficulty, use heuristics
  if (!email.difficulty) {
    const difficultyMap: Record<1 | 2 | 3, 'easy' | 'medium' | 'hard'> = {
      1: 'easy',
      2: 'medium',
      3: 'hard',
    };
    email.difficulty = difficultyMap[heuristicResult.difficulty];
  }

  // Ensure explanation exists
  if (!email.explanation || email.explanation.trim().length === 0) {
    if (email.is_phish) {
      email.explanation = `This is a phishing email. ${heuristicResult.topReasons.map(r => r.label).join(', ')}.`;
    } else {
      email.explanation = 'This is a legitimate email with no suspicious indicators.';
    }
  }

  // Validate difficulty value
  if (!['easy', 'medium', 'hard'].includes(email.difficulty)) {
    email.difficulty = heuristicResult.difficulty === 1 ? 'easy' : heuristicResult.difficulty === 2 ? 'medium' : 'hard';
  }

  return email;
}

/**
 * Main generator function
 */
export async function generateEmails(count: number): Promise<EmailGeneratorResult> {
  // Enforce rate limit
  const maxCount = 20;
  const actualCount = Math.min(count, maxCount);

  const errors: string[] = [];
  let bedrockEmails: BedrockGeneratedEmail[] = [];
  let source: 'bedrock' | 'mock' = 'mock';

  try {
    // Try bedrock first if available, otherwise use mock
    if (hasBedrock()) {
      try {
        bedrockEmails = await bedrockGenerate(actualCount);
        source = 'bedrock';
      } catch (error) {
        console.warn('Bedrock generation failed, falling back to mock:', error);
        errors.push(`Bedrock error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        bedrockEmails = await bedrockMockGenerateEmails(actualCount);
        source = 'mock';
      }
    } else {
      bedrockEmails = await bedrockMockGenerateEmails(actualCount);
      source = 'mock';
    }

    // Convert bedrock format to database format and validate/enrich
    const validatedEmails: GeneratedEmail[] = [];
    for (const bedrockEmail of bedrockEmails) {
      try {
        const dbFormatEmail = convertBedrockEmailToDbFormat(bedrockEmail);
        validatedEmails.push(validateAndEnrichEmail(dbFormatEmail));
      } catch (error) {
        errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      emails: validatedEmails,
      source,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    throw new Error(`Email generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


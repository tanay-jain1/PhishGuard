/**
 * AWS Bedrock LLM Email Generator
 * 
 * Server-only module for generating email samples using Claude 3.5 Haiku.
 * This module should only be imported by API routes (server-side).
 * 
 * WARNING: This module uses server-only environment variables and AWS SDK.
 * Do not import this module in client-side code.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { z } from 'zod';

/**
 * GeneratedEmail schema for validation
 */
const GeneratedEmailSchema = z.object({
  subject: z.string().min(1),
  from_name: z.string().min(1),
  from_email: z.string().email(),
  body_html: z.string().min(1),
  is_phish: z.boolean(),
  explanation: z.string().min(1),
  features: z.array(z.string()).optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

const GeneratedEmailArraySchema = z.array(GeneratedEmailSchema).min(1).max(20);

export type GeneratedEmail = z.infer<typeof GeneratedEmailSchema>;

/**
 * Check if Bedrock is configured with required environment variables
 */
export function hasBedrock(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.BEDROCK_MODEL_ID
    // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are optional if using IAM role
  );
}

/**
 * Generate emails using AWS Bedrock (Claude 3.5 Haiku)
 */
export async function bedrockGenerateEmails(count: number): Promise<GeneratedEmail[]> {
  const region = process.env.AWS_REGION;
  const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-haiku-20241022-v1:0';

  if (!region) {
    throw new Error('AWS_REGION environment variable is required');
  }

  // Create Bedrock client
  // Credentials are optional if using IAM role (e.g., on EC2, Lambda, ECS)
  const clientConfig: {
    region: string;
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
    };
  } = {
    region,
  };

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  const client = new BedrockRuntimeClient(clientConfig);

  // Build system and user prompts
  const systemPrompt = `You are generating realistic examples of emails for a phishing-detection learning game. Produce safe, compact HTML emails. Never include tracking pixels, external scripts, or real credentials. Output strict JSON only.`;

  const userPrompt = `Generate ${count} realistic emails (both legitimate and phishing). For each:

- subject (string, <=120 chars)
- from_name (string)
- from_email (string, looks plausible)
- body_html (compact HTML only: <p>, <a>, <ul>, <b>, <i>)
- is_phish (boolean)
- explanation (1–2 sentences why it's phishing or why legit)
- features (optional string[] flags, choose from: public_domain_sender, domain_misspelling, sender_not_matching_brand, spelling_grammar_issues, urgent_language, tone_mismatch, anchor_mismatch, shortened_link, http_not_https, unexpected_attachment, asks_for_credentials, asks_for_payment, threatens_negative_consequences)
- difficulty (optional 1|2|3; base on number/severity of features)

Return as a JSON array only. No prose.`;

  // Prepare request body for Claude 3.5 Haiku
  const body = new TextEncoder().encode(
    JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })
  );

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    body,
  });

  // Invoke model
  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const jsonText = responseBody.content?.[0]?.text || '';

  // Response guard: Extract JSON from response, handling various formats
  let parsed: unknown;
  
  if (!jsonText || jsonText.trim().length === 0) {
    throw new Error('Empty response from Bedrock');
  }

  try {
    // First, try direct JSON parse
    parsed = JSON.parse(jsonText);
  } catch {
    // If direct parse fails, try to extract JSON from markdown code blocks
    const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1]);
      } catch {
        // Continue to next extraction method
      }
    }

    // If still not parsed, try to find JSON array in the text
    if (!parsed) {
      const arrayMatch = jsonText.match(/(\[[\s\S]*\])/);
      if (arrayMatch) {
        try {
          parsed = JSON.parse(arrayMatch[1]);
        } catch {
          // Continue to next extraction method
        }
      }
    }

    // If still not parsed, try to find any JSON object/array
    if (!parsed) {
      const anyJsonMatch = jsonText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (anyJsonMatch) {
        try {
          parsed = JSON.parse(anyJsonMatch[1]);
        } catch {
          // Last attempt failed
        }
      }
    }

    // If all extraction attempts failed, throw error
    if (!parsed) {
      throw new Error(
        `Failed to extract JSON from Bedrock response. Response preview: ${jsonText.substring(0, 200)}...`
      );
    }
  }

  // Validate with zod
  const validationResult = GeneratedEmailArraySchema.safeParse(parsed);
  
  if (!validationResult.success) {
    throw new Error(
      `Invalid email schema from Bedrock: ${validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
    );
  }

  return validationResult.data;
}

/**
 * Mock generator for development (when Bedrock is not configured)
 */
export async function bedrockMockGenerateEmails(count: number): Promise<GeneratedEmail[]> {
  const emails: GeneratedEmail[] = [];
  
  const emailTypes = [
    {
      category: 'HR/Payroll',
      legitimate: {
        subject: 'Your Payroll Statement is Ready',
        from_name: 'HR Department',
        from_email: 'hr@company.com',
        body_html: '<p>Your payroll statement for this period is now available in your employee portal.</p><p><a href="https://portal.company.com/payroll">View Statement</a></p>',
        is_phish: false,
        explanation: 'Legitimate HR email from official company domain with clear payroll information.',
        difficulty: 1 as const,
      },
      phishing: {
        subject: 'URGENT: Verify Your Payroll Information',
        from_name: 'HR Department',
        from_email: 'hr@company-verify.net',
        body_html: '<p>We need to verify your payroll information immediately. Click here to update:</p><p><a href="http://company-verify.net/update">Verify Now</a></p><p>Your account will be locked if you do not respond within 24 hours.</p>',
        is_phish: true,
        explanation: 'Phishing email with suspicious domain, urgent language, and HTTP link.',
        features: ['Suspicious domain', 'Urgent language', 'HTTP not HTTPS'],
        difficulty: 2 as const,
      },
    },
    {
      category: 'Delivery',
      legitimate: {
        subject: 'Your Package Has Been Delivered',
        from_name: 'FedEx',
        from_email: 'noreply@fedex.com',
        body_html: '<p>Your package was delivered to your address today at 2:30 PM.</p><p>Tracking: <a href="https://www.fedex.com/tracking">View Details</a></p>',
        is_phish: false,
        explanation: 'Legitimate delivery notification from official FedEx domain.',
        difficulty: 1 as const,
      },
      phishing: {
        subject: 'Package Delivery Failed - Action Required',
        from_name: 'FedEx Delivery',
        from_email: 'delivery@fedex-update.com',
        body_html: '<p>Your package delivery failed. Please update your address:</p><p><a href="https://bit.ly/fedex-update">Update Address</a></p><p>You must respond within 2 hours or your package will be returned.</p>',
        is_phish: true,
        explanation: 'Phishing email with suspicious domain, shortened link, and urgent deadline.',
        features: ['Suspicious domain', 'Shortened URL', 'Urgent deadline'],
        difficulty: 2 as const,
      },
    },
    {
      category: 'Bank',
      legitimate: {
        subject: 'Monthly Statement Available',
        from_name: 'Chase Bank',
        from_email: 'noreply@chase.com',
        body_html: '<p>Your monthly statement is now available in Online Banking.</p><p><a href="https://www.chase.com">Sign In</a></p>',
        is_phish: false,
        explanation: 'Legitimate bank email from official Chase domain.',
        difficulty: 1 as const,
      },
      phishing: {
        subject: 'Account Suspension Notice',
        from_name: 'Chase Security',
        from_email: 'security@chase-bank-secure.com',
        body_html: '<p>Your account has been flagged for suspicious activity. Verify your identity immediately:</p><p><a href="http://chase-bank-secure.com/verify">Verify Account</a></p><p>Please provide your SSN and account number to restore access.</p>',
        is_phish: true,
        explanation: 'Phishing email requesting sensitive information with suspicious domain and HTTP link.',
        features: ['Suspicious domain', 'Requests SSN', 'HTTP not HTTPS', 'Threatening language'],
        difficulty: 3 as const,
      },
    },
    {
      category: 'School',
      legitimate: {
        subject: 'Parent-Teacher Conference Reminder',
        from_name: 'Lincoln High School',
        from_email: 'noreply@lincolnhigh.edu',
        body_html: '<p>Reminder: Your parent-teacher conference is scheduled for tomorrow at 3:00 PM.</p><p>Location: Room 205</p>',
        is_phish: false,
        explanation: 'Legitimate school email with clear conference details.',
        difficulty: 1 as const,
      },
      phishing: {
        subject: 'URGENT: Student Account Verification',
        from_name: 'Lincoln High School',
        from_email: 'admin@lincolnhigh-verify.net',
        body_html: '<p>We need to verify your student account information. Click here immediately:</p><p><a href="https://tinyurl.com/lincoln-verify">Verify Account</a></p>',
        is_phish: true,
        explanation: 'Phishing email with suspicious domain and shortened URL.',
        features: ['Suspicious domain', 'Shortened URL', 'Urgent language'],
        difficulty: 2 as const,
      },
    },
    {
      category: 'Newsletter',
      legitimate: {
        subject: 'Weekly Tech Newsletter - Issue #42',
        from_name: 'Tech Weekly',
        from_email: 'newsletter@techweekly.com',
        body_html: '<p>This week\'s top stories:</p><ul><li>AI breakthroughs</li><li>New product launches</li></ul><p><a href="https://www.techweekly.com/unsubscribe">Unsubscribe</a></p>',
        is_phish: false,
        explanation: 'Legitimate newsletter with clear unsubscribe option.',
        difficulty: 1 as const,
      },
      phishing: {
        subject: 'You\'ve Won $10,000!',
        from_name: 'Prize Team',
        from_email: 'winner@prize-lottery.com',
        body_html: '<p>Congratulations! You\'ve won $10,000! Claim your prize now:</p><p><a href="http://prize-lottery.com/claim">Claim Prize</a></p><p>Send us your bank account details to receive your winnings.</p>',
        is_phish: true,
        explanation: 'Phishing email with too-good-to-be-true offer and request for bank details.',
        features: ['Too good to be true', 'Requests bank details', 'HTTP not HTTPS'],
        difficulty: 1 as const,
      },
    },
    {
      category: 'Calendar',
      legitimate: {
        subject: 'Meeting Invitation: Project Review',
        from_name: 'Sarah Johnson',
        from_email: 'sarah.johnson@company.com',
        body_html: '<p>You are invited to a meeting:</p><p><strong>Project Review</strong><br>Date: Next Monday, 10:00 AM<br>Location: Conference Room A</p><p><a href="https://calendar.company.com/accept">Accept</a></p>',
        is_phish: false,
        explanation: 'Legitimate calendar invite from company email address.',
        difficulty: 1 as const,
      },
      phishing: {
        subject: 'Calendar Invite: Click to View',
        from_name: 'Unknown Sender',
        from_email: 'calendar@mail-service.net',
        body_html: '<p>You have a new calendar invitation. Click here to view:</p><p><a href="http://mail-service.net/invite">View Invitation</a></p>',
        is_phish: true,
        explanation: 'Phishing email with generic sender and suspicious link.',
        features: ['Generic sender', 'Suspicious domain', 'HTTP not HTTPS'],
        difficulty: 2 as const,
      },
    },
  ];

  // Generate emails by cycling through types
  for (let i = 0; i < count; i++) {
    const typeIndex = i % emailTypes.length;
    const emailType = emailTypes[typeIndex];
    const isPhish = i % 2 === 0; // Alternate between phishing and legitimate
    
    if (isPhish && emailType.phishing) {
      emails.push(emailType.phishing);
    } else if (!isPhish && emailType.legitimate) {
      emails.push(emailType.legitimate);
    } else {
      // Fallback
      emails.push(emailType.legitimate || emailType.phishing);
    }
  }

  return emails;
}

/**
 * Main generator function that chooses bedrock or mock based on configuration
 */
export async function generateEmails(count: number): Promise<GeneratedEmail[]> {
  // Enforce reasonable limits
  const actualCount = Math.min(Math.max(1, Math.floor(count)), 20);

  if (hasBedrock()) {
    try {
      return await bedrockGenerateEmails(actualCount);
    } catch (error) {
      console.warn('Bedrock generation failed, falling back to mock:', error);
      return await bedrockMockGenerateEmails(actualCount);
    }
  }

  return await bedrockMockGenerateEmails(actualCount);
}


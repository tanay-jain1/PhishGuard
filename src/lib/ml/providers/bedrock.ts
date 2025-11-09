import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { MlInput, MlOutput } from '../types';
import type { MlProvider } from '../provider';

export class BedrockProvider implements MlProvider {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor() {
    const region = process.env.AWS_REGION;
    const modelId = process.env.BEDROCK_MODEL_ID;

    if (!region) {
      throw new Error('AWS_REGION environment variable is required');
    }
    if (!modelId) {
      throw new Error('BEDROCK_MODEL_ID environment variable is required');
    }

    this.modelId = modelId;
    this.client = new BedrockRuntimeClient({
      region,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
    });
  }

  async classifyEmail(input: MlInput): Promise<MlOutput> {
    try {
      // Safely truncate HTML body to ~3-4k chars max
      const maxBodyLength = 3500;
      const truncatedBody = input.body_html.length > maxBodyLength
        ? input.body_html.substring(0, maxBodyLength) + '...'
        : input.body_html;

      // Strip HTML tags for text extraction (simple approach)
      const textBody = truncatedBody
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Build prompt - be very explicit about requiring reasons and tokens
      const prompt = `You are a cybersecurity expert analyzing emails for phishing attempts.

Email Details:
Subject: ${input.subject}
From: ${input.from_name || 'N/A'} <${input.from_email || 'N/A'}>
Body: ${textBody}

Analyze this email and determine if it is a phishing attempt. You MUST return a JSON object with the following EXACT structure:
{
  "prob_phish": <number between 0.0 and 1.0, where 1.0 means definitely phishing and 0.0 means definitely legitimate>,
  "reasons": [<array of 2-4 short reason strings explaining why it is or isn't phishing. ALWAYS provide at least 2 reasons.>],
  "topTokens": [<array of 2-4 feature-like tokens such as "urgent_language", "suspicious_link", "brand_impersonation", "public_domain_sender", "asks_for_credentials", etc. ALWAYS provide at least 2 tokens.>]
}

IMPORTANT: 
- prob_phish must be a number between 0.0 and 1.0 (not 0.5 unless truly uncertain)
- reasons must be an array with at least 2 items
- topTokens must be an array with at least 2 items
- Return ONLY valid JSON, no markdown, no code blocks, no additional text.`;

      // Determine content type based on model ID
      const isClaude = this.modelId.startsWith('anthropic.claude');
      const isTitan = this.modelId.startsWith('amazon.titan');

      let body: Uint8Array;
      let contentType: string;

      if (isClaude) {
        // Claude format - use lower temperature for more consistent results
        contentType = 'application/json';
        body = new TextEncoder().encode(
          JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1024,
            temperature: 0.2, // Lower temperature for more deterministic, consistent results
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          })
        );
      } else if (isTitan) {
        // Titan format
        contentType = 'application/json';
        body = new TextEncoder().encode(
          JSON.stringify({
            inputText: prompt,
            textGenerationConfig: {
              maxTokenCount: 1024,
              temperature: 0.3,
              topP: 0.9,
            },
          })
        );
      } else {
        // Generic format (try Claude-style)
        contentType = 'application/json';
        body = new TextEncoder().encode(
          JSON.stringify({
            prompt,
            max_tokens: 1024,
            temperature: 0.3,
          })
        );
      }

      // Invoke model
      // For newer Claude models (3.5+), we may need to use inference profiles
      // Check if this is an inference profile (contains "inference-profile" or is a profile ARN)
      const isInferenceProfile = this.modelId.includes('inference-profile') || this.modelId.startsWith('arn:aws:bedrock');
      
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType,
        body,
        // For inference profiles, we might need to specify accept header
        accept: isInferenceProfile ? 'application/json' : undefined,
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract text from response based on model type
      let jsonText: string;
      if (isClaude) {
        jsonText = responseBody.content?.[0]?.text || '';
      } else if (isTitan) {
        jsonText = responseBody.results?.[0]?.outputText || '';
      } else {
        jsonText = responseBody.completion || responseBody.outputText || JSON.stringify(responseBody);
      }

      // Parse JSON from response - be more robust
      let parsed: any;
      try {
        // First, try direct JSON parse
        parsed = JSON.parse(jsonText.trim());
      } catch {
        // If direct parse fails, try to extract JSON if wrapped in markdown code blocks
        const codeBlockMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          try {
            parsed = JSON.parse(codeBlockMatch[1]);
          } catch {
            // Continue to next method
          }
        }
        
        // If still not parsed, try to find JSON object in text
        if (!parsed) {
          const jsonMatch = jsonText.match(/(\{[\s\S]*?\})/);
          if (jsonMatch) {
            try {
              parsed = JSON.parse(jsonMatch[1]);
            } catch {
              // Last attempt
            }
          }
        }
        
        if (!parsed) {
          console.error('Failed to parse Bedrock response as JSON:', {
            jsonText: jsonText.substring(0, 500),
            fullResponse: jsonText,
          });
          throw new Error(`No valid JSON found in response. Response preview: ${jsonText.substring(0, 200)}`);
        }
      }

      // Extract and validate output - ensure we have meaningful data
      const prob_phish_raw = parsed.prob_phish;
      let prob_phish: number;
      
      // Convert to number if it's a string
      if (typeof prob_phish_raw === 'string') {
        prob_phish = parseFloat(prob_phish_raw);
        if (isNaN(prob_phish)) {
          prob_phish = 0.5;
        }
      } else if (typeof prob_phish_raw === 'number') {
        prob_phish = prob_phish_raw;
      } else {
        prob_phish = 0.5;
      }
      
      // Clamp to 0-1 range
      prob_phish = Math.max(0, Math.min(1, prob_phish));
      
      // Extract reasons and tokens
      const reasons = Array.isArray(parsed.reasons) 
        ? parsed.reasons.filter((r: any) => r && typeof r === 'string' && r.trim().length > 0)
        : [];
      const topTokens = Array.isArray(parsed.topTokens)
        ? parsed.topTokens.filter((t: any) => t && typeof t === 'string' && t.trim().length > 0)
        : [];

      // Log the actual response for debugging
      console.log('Bedrock ML classification result:', {
        prob_phish,
        reasonsCount: reasons.length,
        tokensCount: topTokens.length,
        hasValidData: reasons.length > 0 || topTokens.length > 0,
      });

      // If we got default probability with no insights, log warning
      if (prob_phish === 0.5 && reasons.length === 0 && topTokens.length === 0) {
        console.warn('Bedrock returned default values - may indicate parsing failure:', {
          parsed,
          jsonText: jsonText.substring(0, 300),
        });
      }

      return {
        prob_phish,
        reasons: reasons.length > 0 ? reasons : undefined,
        topTokens: topTokens.length > 0 ? topTokens : undefined,
      };
    } catch (error) {
      console.error('Bedrock classification error:', error);
      // Return undefined to indicate failure (not default 0.5)
      throw error; // Let the caller handle the error
    }
  }
}


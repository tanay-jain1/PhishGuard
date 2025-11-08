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

      // Build prompt
      const prompt = `You are a cybersecurity expert analyzing emails for phishing attempts.

Email Details:
Subject: ${input.subject}
From: ${input.from_name || 'N/A'} <${input.from_email || 'N/A'}>
Body: ${textBody}

Analyze this email and determine if it is a phishing attempt. Return your analysis as a JSON object with the following structure:
{
  "prob_phish": <number between 0 and 1, where 1 means definitely phishing>,
  "reasons": [<array of 2-4 short reason strings explaining why it is or isn't phishing>],
  "topTokens": [<optional array of 2-4 feature-like tokens such as "urgent_language", "suspicious_link", "brand_impersonation", etc.>]
}

Only return valid JSON, no additional text.`;

      // Determine content type based on model ID
      const isClaude = this.modelId.startsWith('anthropic.claude');
      const isTitan = this.modelId.startsWith('amazon.titan');

      let body: Uint8Array;
      let contentType: string;

      if (isClaude) {
        // Claude format
        contentType = 'application/json';
        body = new TextEncoder().encode(
          JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 1024,
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

      // Parse JSON from response
      let parsed: any;
      try {
        // Try to extract JSON if wrapped in markdown code blocks
        const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || jsonText.match(/(\{[\s\S]*\})/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[1] : jsonText);
      } catch {
        // If direct parse fails, try to find JSON object in text
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in response');
        }
      }

      // Extract and validate output
      const prob_phish = Math.max(0, Math.min(1, parsed.prob_phish ?? 0.5));
      const reasons = Array.isArray(parsed.reasons) ? parsed.reasons : [];
      const topTokens = Array.isArray(parsed.topTokens) ? parsed.topTokens : [];

      return {
        prob_phish,
        reasons: reasons.length > 0 ? reasons : undefined,
        topTokens: topTokens.length > 0 ? topTokens : undefined,
      };
    } catch (error) {
      console.error('Bedrock classification error:', error);
      return { prob_phish: 0.5, reasons: [], topTokens: [] };
    }
  }
}


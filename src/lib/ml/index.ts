import { NoopProvider, type MlProvider } from './provider';
import type { MlInput, MlOutput } from './types';

export type { MlInput, MlOutput } from './types';
export type { MlProvider } from './provider';

export async function getMlProvider(): Promise<MlProvider> {
  if (process.env.USE_BEDROCK === '1') {
    const hasAwsEnv =
      process.env.AWS_REGION &&
      process.env.BEDROCK_MODEL_ID &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY;

    if (hasAwsEnv) {
      try {
        const { BedrockProvider } = await import('./providers/bedrock');
        return new BedrockProvider();
      } catch (error) {
        console.warn('Failed to load Bedrock provider, falling back to NoopProvider:', error);
        return new NoopProvider();
      }
    }
  }

  return new NoopProvider();
}


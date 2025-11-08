import type { MlInput, MlOutput } from './types';

export interface MlProvider {
  classifyEmail(input: MlInput): Promise<MlOutput>;
}

export class NoopProvider implements MlProvider {
  async classifyEmail(): Promise<MlOutput> {
    return { prob_phish: 0.5, reasons: [], topTokens: [] };
  }
}


import { NextResponse } from 'next/server';
import { getMlProvider } from '@/lib/ml';

/**
 * Debug endpoint to check Bedrock configuration
 * GET /api/debug/bedrock
 */
export async function GET() {
  const diagnostics = {
    env: {
      USE_BEDROCK: process.env.USE_BEDROCK,
      AWS_REGION: process.env.AWS_REGION ? '***set***' : 'missing',
      BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID ? '***set***' : 'missing',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '***set***' : 'missing',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '***set***' : 'missing',
    },
    checks: {
      useBedrockEnabled: process.env.USE_BEDROCK === '1',
      hasAwsRegion: !!process.env.AWS_REGION,
      hasModelId: !!process.env.BEDROCK_MODEL_ID,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      allRequiredSet: !!(
        process.env.USE_BEDROCK === '1' &&
        process.env.AWS_REGION &&
        process.env.BEDROCK_MODEL_ID &&
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY
      ),
    },
    provider: {
      type: 'unknown',
      error: null as string | null,
      errorStack: undefined as string | undefined,
      testResult: undefined as any,
      testError: undefined as string | undefined,
    },
  };

  try {
    const provider = await getMlProvider();
    diagnostics.provider.type = provider.constructor.name;
    
    // Try a test classification
    try {
      const testResult = await provider.classifyEmail({
        subject: 'Test email',
        body_html: '<p>This is a test</p>',
        from_email: 'test@example.com',
        from_name: 'Test',
      });
      diagnostics.provider.testResult = {
        prob_phish: testResult.prob_phish,
        hasReasons: !!testResult.reasons && testResult.reasons.length > 0,
        hasTokens: !!testResult.topTokens && testResult.topTokens.length > 0,
      };
    } catch (testError) {
      diagnostics.provider.testError = testError instanceof Error ? testError.message : 'Unknown error';
      diagnostics.provider.errorStack = testError instanceof Error ? testError.stack : undefined;
    }
  } catch (error) {
    diagnostics.provider.error = error instanceof Error ? error.message : 'Unknown error';
    diagnostics.provider.errorStack = error instanceof Error ? error.stack : undefined;
  }

  return NextResponse.json(diagnostics, { status: 200 });
}


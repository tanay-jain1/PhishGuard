import { NextResponse } from 'next/server';
import { analyzeEmail } from '@/lib/heuristics';
import { getMlProvider } from '@/lib/ml';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, body_html, from_email, from_name } = body;

    // Basic validation
    if (!subject || typeof subject !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid subject' },
        { status: 400 }
      );
    }

    if (!body_html || typeof body_html !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid body_html' },
        { status: 400 }
      );
    }

    // Run heuristics analysis
    const heuristicsResult = analyzeEmail({
      subject,
      body_html,
      from_email: from_email || null,
      from_name: from_name || null,
    });

    // Prepare response with heuristics
    const response: {
      heuristics: {
        flags: Array<{ key: string; label: string; detail?: string; weight: number }>;
        flagKeys: string[];
        phishScore: number;
        difficulty: 1 | 2 | 3;
        topReasons: Array<{ key: string; label: string; weight: number; detail?: string }>;
      };
      ml?: {
        prob_phish: number;
        reasons?: string[];
        topTokens?: string[];
      };
    } = {
      heuristics: {
        flags: heuristicsResult.flags,
        flagKeys: heuristicsResult.flagKeys,
        phishScore: heuristicsResult.phishScore,
        difficulty: heuristicsResult.difficulty,
        topReasons: heuristicsResult.topReasons,
      },
    };

    // Run ML classification if Bedrock is enabled
    if (process.env.USE_BEDROCK === '1') {
      try {
        const mlProvider = await getMlProvider();
        
        // Truncate body_html to ~4000 chars before sending to ML
        const maxBodyLength = 4000;
        const truncatedBodyHtml =
          body_html.length > maxBodyLength
            ? body_html.substring(0, maxBodyLength)
            : body_html;

        const mlResult = await mlProvider.classifyEmail({
          subject,
          body_html: truncatedBodyHtml,
          from_email: from_email || null,
          from_name: from_name || null,
        });

        // Include ML results if we have meaningful insights
        // We require either reasons OR tokens to show Model Assist
        const hasReasons = mlResult.reasons && mlResult.reasons.length > 0;
        const hasTokens = mlResult.topTokens && mlResult.topTokens.length > 0;

        if (hasReasons || hasTokens) {
          response.ml = {
            prob_phish: mlResult.prob_phish,
            reasons: mlResult.reasons,
            topTokens: mlResult.topTokens,
          };
          console.log('ML classification successful:', {
            prob_phish: mlResult.prob_phish,
            reasonsCount: mlResult.reasons?.length || 0,
            tokensCount: mlResult.topTokens?.length || 0,
          });
        } else {
          // ML returned probability but no insights - log for debugging
          console.warn('ML returned probability but no reasons/tokens - skipping ML section', {
            prob_phish: mlResult.prob_phish,
            hasReasons: !!mlResult.reasons,
            hasTokens: !!mlResult.topTokens,
          });
        }
      } catch (error) {
        console.error('ML classification error:', error);
        // Continue without ML results if ML fails
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}


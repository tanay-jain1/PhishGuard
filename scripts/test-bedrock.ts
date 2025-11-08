/**
 * Test script to verify Bedrock integration
 * 
 * Usage: npx tsx scripts/test-bedrock.ts
 */

import { config } from 'dotenv';
import * as path from 'path';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Load environment variables
config({ path: path.join(process.cwd(), '.env.local') });

async function testBedrock() {
  console.log('🧪 Testing Bedrock Integration...\n');

  // Check environment variables
  const requiredVars = [
    'USE_BEDROCK',
    'AWS_REGION',
    'BEDROCK_MODEL_ID',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
  ];

  console.log('📋 Checking environment variables:');
  const missingVars: string[] = [];
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive values
      if (varName.includes('SECRET') || varName.includes('KEY')) {
        console.log(`  ✅ ${varName}: ${value.substring(0, 8)}...`);
      } else {
        console.log(`  ✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`  ❌ ${varName}: MISSING`);
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing required variables: ${missingVars.join(', ')}`);
    console.log('   Please add them to .env.local');
    process.exit(1);
  }

  if (process.env.USE_BEDROCK !== '1') {
    console.log('\n⚠️  USE_BEDROCK is not set to "1"');
    console.log('   Bedrock will not be enabled');
    process.exit(0);
  }

  // Test Bedrock connection
  console.log('\n🔌 Testing Bedrock connection...');
  
  try {
    const client = new BedrockRuntimeClient({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const modelId = process.env.BEDROCK_MODEL_ID!;
    console.log(`   Model: ${modelId}`);
    console.log(`   Region: ${process.env.AWS_REGION}`);

    // Prepare a test request
    const testPrompt = 'Hello, this is a test. Please respond with: {"test": "success"}';
    
    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: testPrompt,
        },
      ],
    });

    console.log('\n📤 Sending test request...');
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      body: new TextEncoder().encode(body),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('✅ SUCCESS! Bedrock connection works!');
    console.log(`   Response received: ${responseBody.content?.[0]?.text?.substring(0, 100) || 'OK'}...`);
    console.log('\n🎉 Your Bedrock integration is ready to use!');
    
  } catch (error: any) {
    console.log('\n❌ ERROR: Bedrock connection failed');
    console.log(`   Error: ${error.message}`);
    
    if (error.name === 'ValidationException') {
      console.log('\n💡 Possible issues:');
      console.log('   - Model ID might be incorrect');
      console.log('   - Model access might not be approved yet');
      console.log('   - Check Bedrock console for model availability');
    } else if (error.name === 'AccessDeniedException') {
      console.log('\n💡 Possible issues:');
      console.log('   - IAM user might not have Bedrock permissions');
      console.log('   - Check IAM user has AmazonBedrockFullAccess policy');
    } else if (error.name === 'UnrecognizedClientException') {
      console.log('\n💡 Possible issues:');
      console.log('   - AWS credentials might be incorrect');
      console.log('   - Check Access Key ID and Secret Access Key');
    }
    
    console.log('\n📝 Full error details:');
    console.error(error);
    process.exit(1);
  }
}

testBedrock()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


/**
 * Simple test for AI File Naming SDK
 */

import { FileNamingSDK } from './src';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function simpleTest() {
  console.log('🚀 Simple AI File Naming Test\n');

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    console.error('Please create a .env file with your API key or set the environment variable');
    process.exit(1);
  }

  // Initialize SDK
  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai',
      apiKey,
      model: 'gpt-4-vision-preview',
      maxRetries: 3,
      timeout: 60000,
      temperature: 0.7,
    },
  });

  try {
    // Test with an image file
    const testFile = '/Users/jinhu/Projects/AIO/AIO 注册材料/AIO公司注册/费用报销/公司注册/ITIN 淘宝.jpg';
    console.log(`Testing with: ${testFile}\n`);

    const result = await sdk.nameFile(testFile, {
      prompt: 'Analyze this image and create a descriptive filename based on what you see. Focus on the main content, text, or purpose visible in the image.',
      caseFormat: 'snake_case',
    });

    console.log('Result:');
    console.log(`  Original: ${result.originalName}`);
    console.log(`  Suggested: ${result.suggestedName}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);

    if (result.reasoning) {
      console.log(`\nReasoning: ${result.reasoning}`);
    }

    // Check provider metrics
    const metrics = sdk.getProviderMetrics();
    console.log('\nMetrics:');
    console.log(`  Tokens used: ${metrics?.totalTokensUsed || 0}`);

  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

simpleTest().catch(console.error);
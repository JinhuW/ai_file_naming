/**
 * Test AI naming for video file
 */

import * as dotenv from 'dotenv';
import { FileNamingSDK, initializeProviders } from '../src/index';

dotenv.config();
initializeProviders();

async function main() {
  const apiKey = process.env['OPEN_AI_API_KEY'] || process.env['OPENAI_API_KEY'];

  if (!apiKey) {
    console.error('❌ OPEN_AI_API_KEY not set');
    process.exit(1);
  }

  console.log('🎬 Testing AI File Naming - Video File\n');
  console.log('═'.repeat(70));

  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai' as const,
      apiKey,
      model: 'gpt-5-mini',
      maxRetries: 3,
      timeout: 60000,  // Increased timeout for video processing
      temperature: 1,
    },
    logging: {
      level: 'info',
      format: 'pretty',
    },
    cache: {
      enabled: false,
      ttl: 1000,
      maxSize: 1,
    },
  });

  console.log('✅ SDK initialized with GPT-5-mini\n');

  const videoPath = '/Users/jinhu/Desktop/test.mov';

  console.log(`📄 File: ${videoPath}`);
  console.log(`Original filename: test.mov\n`);

  console.log('🤖 Processing video with AI...');
  console.log('   (This may take longer for video files)\n');

  const startTime = Date.now();

  try {
    const result = await sdk.nameFile(videoPath, {
      analyzeContent: true,
    });

    const duration = Date.now() - startTime;

    console.log('✅ AI Naming Complete!\n');
    console.log('═'.repeat(70));
    console.log(`Original:        test.mov`);
    console.log(`AI Suggested:    ${result.suggestedName}.mov`);
    console.log(`Confidence:      ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Processing time: ${(duration / 1000).toFixed(2)}s`);

    if (result.reasoning) {
      console.log(`\nReasoning:`);
      console.log(`  ${result.reasoning.substring(0, 300)}${result.reasoning.length > 300 ? '...' : ''}`);
    }

    console.log('═'.repeat(70));

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error('\nError details:', error);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main().catch(console.error);

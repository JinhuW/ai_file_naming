/**
 * Test naming user's PDF file
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

  console.log('🤖 AI File Naming - User PDF Test\n');

  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai' as const,
      apiKey,
      model: 'gpt-5-mini',
      maxRetries: 3,
      timeout: 30000,
      temperature: 1,  // GPT-5 only supports default temperature (1)
    },
    logging: {
      level: 'debug',
      format: 'pretty',
    },
    cache: {
      enabled: false, // Disable cache for testing
      ttl: 1000,
      maxSize: 1,
    },
  });

  console.log('✅ SDK initialized with gpt-5-mini\n');

  const pdfPath = '/Users/jinhu/Desktop/SEW全球网点.pdf';

  console.log(`📄 Testing file: ${pdfPath}\n`);

  try {
    console.log('Processing with AI analysis...');
    const result = await sdk.nameFile(pdfPath, {
      analyzeContent: true,
    });

    console.log('\n✅ File naming completed!');
    console.log('═'.repeat(70));
    console.log(`Original name: SEW全球网点.pdf`);
    console.log(`Suggested name: ${result.suggestedName}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);

    if (result.reasoning) {
      console.log(`Reasoning: ${result.reasoning.substring(0, 100)}...`);
    }

    console.log('═'.repeat(70));

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

main().catch(console.error);

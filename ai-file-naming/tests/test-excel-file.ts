/**
 * Test AI naming for Excel file
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

  console.log('📊 Testing AI File Naming - Excel File\n');
  console.log('═'.repeat(70));

  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai' as const,
      apiKey,
      model: 'gpt-5-mini',
      maxRetries: 3,
      timeout: 30000,
      temperature: 1,  // GPT-5 only supports default temperature
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

  const excelPath = '/Users/jinhu/Desktop/Tungsung 25.9.22.xlsx';

  console.log(`📄 File: ${excelPath}`);
  console.log(`Original filename: Tungsung 25.9.22.xlsx\n`);

  console.log('🤖 Processing with AI...\n');

  const startTime = Date.now();

  try {
    const result = await sdk.nameFile(excelPath, {
      analyzeContent: true,
    });

    const duration = Date.now() - startTime;

    console.log('✅ AI Naming Complete!\n');
    console.log('═'.repeat(70));
    console.log(`Original:        Tungsung 25.9.22.xlsx`);
    console.log(`AI Suggested:    ${result.suggestedName}.xlsx`);
    console.log(`Confidence:      ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Processing time: ${(duration / 1000).toFixed(2)}s`);

    if (result.reasoning) {
      console.log(`\nReasoning:`);
      console.log(`  ${result.reasoning.substring(0, 200)}${result.reasoning.length > 200 ? '...' : ''}`);
    }

    console.log('═'.repeat(70));

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main().catch(console.error);

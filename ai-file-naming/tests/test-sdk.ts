/**
 * Test script for AI File Naming SDK
 */

import { FileNamingSDK, EventName } from './src';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSDK() {
  console.log('🚀 Testing AI File Naming SDK\n');

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    console.error('Please create a .env file with your API key or set the environment variable');
    process.exit(1);
  }

  // Initialize SDK with the provided API key
  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai',
      apiKey,
      model: 'gpt-4-vision-preview',
      maxRetries: 3,
      timeout: 30000,
      temperature: 0.7,
    },
    naming: {
      format: 'snake_case',
      maxLength: 80,
      sanitize: true,
      replaceSpaces: '_',
      removeSpecialChars: true,
    },
    logging: {
      level: 'info',
      format: 'pretty',
    },
  });

  // Test folder path
  const testFolder = '/Users/jinhu/Projects/AIO/AIO 注册材料';

  // Event listeners
  sdk.on(EventName.NamingStart, (event: any) => {
    console.log(`📝 Processing: ${path.basename(event.request.filePath)}`);
  });

  sdk.on(EventName.NamingComplete, (event: any) => {
    console.log(`✅ Complete: ${event.response.suggestedName} (${(event.response.confidence * 100).toFixed(0)}% confidence)`);
  });

  sdk.on(EventName.NamingError, (event: any) => {
    console.error(`❌ Error: ${event.error.message}`);
  });

  try {
    // Test 1: Test provider connection
    console.log('📡 Testing connection to OpenAI...');
    const connected = await sdk.testConnection();
    console.log(connected ? '✅ Connection successful!\n' : '❌ Connection failed!\n');

    if (!connected) {
      console.error('Cannot proceed without connection to OpenAI');
      return;
    }

    // Test 2: Name a single file (the folder itself)
    console.log('=== Test 1: Single File Naming ===\n');
    console.log(`Testing with: ${testFolder}\n`);

    try {
      const result = await sdk.nameFile(testFolder, {
        prompt: 'Generate a descriptive name for this folder based on its content and purpose. The folder contains registration materials.',
        caseFormat: 'snake_case',
      });

      console.log('\n📊 Naming Result:');
      console.log(`  Original: ${result.originalName}`);
      console.log(`  Suggested: ${result.suggestedName}`);
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      if (result.reasoning) {
        console.log(`  Reasoning: ${result.reasoning.substring(0, 100)}...`);
      }
      console.log();
    } catch (error) {
      console.error('Error in single file naming:', error);
    }

    // Test 3: Batch naming for files in the folder
    console.log('=== Test 2: Batch File Naming ===\n');
    console.log(`Processing all files in: ${testFolder}\n`);

    try {
      const batchResult = await sdk.nameBatch(testFolder, {
        concurrency: 3,
        continueOnError: true,
        caseFormat: 'kebab-case',
      });

      console.log('\n📊 Batch Results:');
      console.log(`  Total processed: ${batchResult.totalProcessed}`);
      console.log(`  Successful: ${batchResult.totalSuccess}`);
      console.log(`  Failed: ${batchResult.totalFailed}`);
      console.log(`  Duration: ${(batchResult.duration / 1000).toFixed(2)}s`);

      if (batchResult.successful.length > 0) {
        console.log('\n  ✅ Successfully named:');
        batchResult.successful.slice(0, 5).forEach(res => {
          console.log(`    • ${res.originalName} → ${res.suggestedName}`);
        });
        if (batchResult.successful.length > 5) {
          console.log(`    ... and ${batchResult.successful.length - 5} more`);
        }
      }

      if (batchResult.failed.length > 0) {
        console.log('\n  ❌ Failed:');
        batchResult.failed.forEach(res => {
          console.log(`    • ${res.originalName}: ${res.error?.message}`);
        });
      }
    } catch (error) {
      console.error('Error in batch naming:', error);
    }

    // Show metrics
    console.log('\n=== Provider Metrics ===\n');
    const metrics = sdk.getProviderMetrics();
    if (metrics) {
      console.log(`  Total requests: ${metrics.totalRequests}`);
      console.log(`  Successful: ${metrics.successfulRequests}`);
      console.log(`  Failed: ${metrics.failedRequests}`);
      console.log(`  Average latency: ${metrics.averageLatency.toFixed(0)}ms`);
      console.log(`  Total tokens: ${metrics.totalTokensUsed}`);
    }

    console.log('\n✨ Testing complete!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testSDK().catch(console.error);
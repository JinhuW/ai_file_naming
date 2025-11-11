/**
 * Test script for AI File Naming SDK with Image Files
 */

import { FileNamingSDK, EventName } from './src';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testImageFiles() {
  console.log('🚀 Testing AI File Naming SDK with Image Files\n');
  console.log('=' .repeat(60) + '\n');

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
    naming: {
      format: 'snake_case',
      maxLength: 80,
      sanitize: true,
      replaceSpaces: '_',
      removeSpecialChars: true,
    },
    batch: {
      concurrency: 2,
      chunkSize: 10,
      retryFailedItems: true,
    },
    logging: {
      level: 'info',
      format: 'pretty',
    },
  });

  // Test image files
  const testImages = [
    '/Users/jinhu/Projects/AIO/AIO 注册材料/AIO公司注册/费用报销/公司注册/ITIN 淘宝.jpg',
    '/Users/jinhu/Projects/AIO/AIO 注册材料/AIO公司注册/费用报销/公司注册/WechatIMG33.jpg',
    '/Users/jinhu/Projects/AIO/AIO 注册材料/AIO公司注册/费用报销/底特律报销/show_to_airport.png',
  ];

  // Event listeners
  sdk.on(EventName.NamingStart, (event: any) => {
    const fileName = path.basename(event.request?.filePath || 'Unknown');
    console.log(`\n📝 Processing: ${fileName}`);
  });

  sdk.on(EventName.NamingComplete, (event: any) => {
    console.log(`   ✅ Suggested: "${event.response.suggestedName}"`);
    console.log(`   📊 Confidence: ${(event.response.confidence * 100).toFixed(0)}%`);
  });

  sdk.on(EventName.ProviderRequest, (event: any) => {
    console.log(`   🔄 Sending request to ${event.provider}...`);
  });

  sdk.on(EventName.ProviderResponse, (event: any) => {
    console.log(`   ✨ Response received in ${event.duration}ms`);
  });

  try {
    // Test connection
    console.log('📡 Testing Connection\n');
    const connected = await sdk.testConnection();

    if (!connected) {
      console.error('❌ Failed to connect to OpenAI. Please check your API key.');
      return;
    }

    console.log('✅ Connection successful!\n');

    // Test 1: Single image naming
    console.log('=' .repeat(60));
    console.log('\n🎯 Test 1: Single Image Naming\n');

    const firstImage = testImages[0]!;
    console.log(`Testing with: ${path.basename(firstImage)}`);

    try {
      const result = await sdk.nameFile(firstImage, {
        prompt: 'Analyze this image and generate a descriptive filename that clearly indicates what is shown in the image. Focus on the main subject, action, or purpose of the image.',
        caseFormat: 'snake_case',
      });

      console.log('\n📊 Result:');
      console.log(`  Original:  "${result.originalName}"`);
      console.log(`  Suggested: "${result.suggestedName}"`);
      console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);

      if (result.reasoning) {
        console.log(`\n  💭 Reasoning:`);
        console.log(`  ${result.reasoning.substring(0, 200)}${result.reasoning.length > 200 ? '...' : ''}`);
      }
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
    }

    // Test 2: Batch image processing
    console.log('\n' + '=' .repeat(60));
    console.log('\n🎯 Test 2: Batch Image Processing\n');

    console.log('Processing multiple images...\n');

    const batchResult = await sdk.nameBatch(testImages.slice(0, 2), {
      concurrency: 2,
      continueOnError: true,
      caseFormat: 'kebab-case',
      prompt: 'Analyze this image and create a descriptive filename that captures the key visual elements and context.',
    });

    console.log('📊 Batch Results:');
    console.log(`  Total: ${batchResult.totalProcessed}`);
    console.log(`  Success: ${batchResult.totalSuccess}`);
    console.log(`  Failed: ${batchResult.totalFailed}`);
    console.log(`  Time: ${(batchResult.duration / 1000).toFixed(2)}s`);

    if (batchResult.successful.length > 0) {
      console.log('\n✅ Results:');
      batchResult.successful.forEach((res, i) => {
        console.log(`\n  ${i + 1}. "${res.originalName}"`);
        console.log(`     → "${res.suggestedName}"`);
      });
    }

    // Test 3: Test with different naming formats
    console.log('\n' + '=' .repeat(60));
    console.log('\n🎯 Test 3: Different Naming Formats\n');

    const formats = ['snake_case', 'kebab-case', 'camelCase', 'PascalCase'] as const;
    const testImage = testImages[1]!;

    console.log(`Testing different formats with: ${path.basename(testImage)}\n`);

    for (const format of formats) {
      const result = await sdk.nameFile(testImage, {
        caseFormat: format,
        prompt: 'Generate a short, clear filename for this image.',
      });

      console.log(`  ${format.padEnd(12)}: "${result.suggestedName}"`);
    }

    // Show metrics
    console.log('\n' + '=' .repeat(60));
    console.log('\n📈 Final Metrics\n');

    const metrics = sdk.getProviderMetrics();
    console.log(`  API Calls: ${metrics?.totalRequests || 0}`);
    console.log(`  Success Rate: ${
      metrics?.totalRequests
        ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)
        : '0'
    }%`);
    console.log(`  Avg Response Time: ${metrics?.averageLatency?.toFixed(0) || 0}ms`);
    console.log(`  Total Tokens: ${metrics?.totalTokensUsed || 0}`);
    console.log(`  Cache Hits: ${sdk.getCacheSize()}`);

    console.log('\n' + '=' .repeat(60));
    console.log('\n✨ All tests completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
console.log('Starting Image Files Test...\n');
testImageFiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
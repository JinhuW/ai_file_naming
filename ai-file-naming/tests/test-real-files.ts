/**
 * Real-world test script for AI File Naming SDK
 */

import { FileNamingSDK, EventName } from './src';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testRealFiles() {
  console.log('🚀 Testing AI File Naming SDK with Real Files\n');
  console.log('=' .repeat(60) + '\n');

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
      model: 'gpt-4-turbo-preview', // Using a model that exists
      maxRetries: 3,
      timeout: 60000, // 60 seconds for file operations
      temperature: 0.7,
    },
    naming: {
      format: 'snake_case',
      maxLength: 100,
      sanitize: true,
      replaceSpaces: '_',
      removeSpecialChars: true,
    },
    batch: {
      concurrency: 2, // Lower concurrency to avoid rate limits
      chunkSize: 10,
      retryFailedItems: true,
    },
    logging: {
      level: 'info',
      format: 'pretty',
    },
  });

  // Test folder path
  const testFolder = '/Users/jinhu/Projects/AIO/AIO 注册材料';

  // Event listeners with better formatting
  sdk.on(EventName.NamingStart, (event: any) => {
    const fileName = event.request?.filePath ? path.basename(event.request.filePath) : 'Unknown';
    console.log(`\n📝 Processing: ${fileName}`);
  });

  sdk.on(EventName.NamingComplete, (event: any) => {
    if (event.response) {
      console.log(`   ✅ Suggested: "${event.response.suggestedName}"`);
      console.log(`   📊 Confidence: ${(event.response.confidence * 100).toFixed(0)}%`);
      if (event.duration) {
        console.log(`   ⏱️  Time: ${event.duration}ms`);
      }
    }
  });

  sdk.on(EventName.NamingError, (event: any) => {
    console.error(`   ❌ Error: ${event.error?.message || event.error}`);
  });

  sdk.on(EventName.BatchProgress, (event: any) => {
    const percentage = ((event.processed / event.total) * 100).toFixed(0);
    console.log(`\n📈 Batch Progress: ${event.processed}/${event.total} (${percentage}%)`);
  });

  try {
    // Test 1: Test provider connection
    console.log('📡 Testing Connection to OpenAI\n');
    const connected = await sdk.testConnection();

    if (connected) {
      console.log('✅ Connection successful!\n');
    } else {
      console.log('❌ Connection failed! Please check your API key.\n');
      return;
    }

    // Test 2: Get list of actual files (not directories)
    console.log('=' .repeat(60));
    console.log('\n📂 Scanning folder for files...\n');

    const entries = await fs.readdir(testFolder, { withFileTypes: true });
    const files = entries
      .filter(entry => entry.isFile())
      .map(entry => path.join(testFolder, entry.name))
      .filter(file => !path.basename(file).startsWith('.')); // Exclude hidden files

    console.log(`Found ${files.length} files to process:`);
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${path.basename(file)}`);
    });

    if (files.length === 0) {
      console.log('\nNo files found in the directory to process.');
      return;
    }

    // Test 3: Test single file naming (first file found)
    console.log('\n' + '=' .repeat(60));
    console.log('\n🎯 Test 1: Single File Naming\n');

    const testFile = files[0];
    if (testFile) {
      console.log(`Testing with: ${path.basename(testFile)}`);

      try {
        const result = await sdk.nameFile(testFile, {
          prompt: 'Analyze this file and generate a clear, descriptive filename that reflects its content and purpose. Consider the file type and any relevant metadata.',
          caseFormat: 'snake_case',
        });

        console.log('\n📊 Naming Result:');
        console.log(`  Original:  "${result.originalName}"`);
        console.log(`  Suggested: "${result.suggestedName}"`);
        console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);

        if (result.reasoning) {
          console.log(`  Reasoning: ${result.reasoning.substring(0, 150)}${result.reasoning.length > 150 ? '...' : ''}`);
        }
      } catch (error: any) {
        console.error(`\n❌ Error naming file: ${error.message}`);
      }
    }

    // Test 4: Batch naming for multiple files
    if (files.length > 1) {
      console.log('\n' + '=' .repeat(60));
      console.log('\n🎯 Test 2: Batch File Naming\n');

      // Take up to 3 files for batch test
      const batchFiles = files.slice(0, Math.min(3, files.length));
      console.log(`Processing ${batchFiles.length} files in batch mode...\n`);

      try {
        const batchResult = await sdk.nameBatch(batchFiles, {
          concurrency: 2,
          continueOnError: true,
          caseFormat: 'kebab-case',
          prompt: 'Generate a descriptive filename for this document that clearly indicates its purpose and content.',
        });

        console.log('\n' + '=' .repeat(60));
        console.log('\n📊 Batch Results Summary:');
        console.log(`  Total Processed: ${batchResult.totalProcessed}`);
        console.log(`  ✅ Successful: ${batchResult.totalSuccess}`);
        console.log(`  ❌ Failed: ${batchResult.totalFailed}`);
        console.log(`  ⏱️  Total Duration: ${(batchResult.duration / 1000).toFixed(2)}s`);

        if (batchResult.successful.length > 0) {
          console.log('\n✅ Successfully Named Files:');
          batchResult.successful.forEach((res, index) => {
            console.log(`\n  ${index + 1}. Original:  "${res.originalName}"`);
            console.log(`     Suggested: "${res.suggestedName}"`);
            console.log(`     Confidence: ${(res.confidence * 100).toFixed(0)}%`);
          });
        }

        if (batchResult.failed.length > 0) {
          console.log('\n❌ Failed Files:');
          batchResult.failed.forEach((res, index) => {
            console.log(`  ${index + 1}. ${res.originalName}`);
            console.log(`     Error: ${res.error?.message}`);
          });
        }
      } catch (error: any) {
        console.error(`\n❌ Batch processing error: ${error.message}`);
      }
    }

    // Test 5: Test with different file types
    console.log('\n' + '=' .repeat(60));
    console.log('\n🎯 Test 3: File Type Detection\n');

    const fileTypes = new Map<string, string[]>();
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!fileTypes.has(ext)) {
        fileTypes.set(ext, []);
      }
      fileTypes.get(ext)?.push(path.basename(file));
    }

    console.log('File types found:');
    fileTypes.forEach((fileList, ext) => {
      console.log(`  ${ext || '(no extension)'}: ${fileList.length} file(s)`);
      fileList.slice(0, 2).forEach(name => {
        console.log(`    - ${name}`);
      });
      if (fileList.length > 2) {
        console.log(`    ... and ${fileList.length - 2} more`);
      }
    });

    // Show final metrics
    console.log('\n' + '=' .repeat(60));
    console.log('\n📈 Provider Metrics\n');

    const metrics = sdk.getProviderMetrics();
    if (metrics) {
      console.log(`  Total API Requests: ${metrics.totalRequests}`);
      console.log(`  ✅ Successful: ${metrics.successfulRequests}`);
      console.log(`  ❌ Failed: ${metrics.failedRequests}`);
      if (metrics.averageLatency > 0) {
        console.log(`  ⏱️  Average Latency: ${metrics.averageLatency.toFixed(0)}ms`);
      }
      if (metrics.totalTokensUsed > 0) {
        console.log(`  🎯 Total Tokens Used: ${metrics.totalTokensUsed}`);
      }
    }

    // Cache statistics
    console.log('\n📦 Cache Statistics\n');
    console.log(`  Cached Items: ${sdk.getCacheSize()}`);

    console.log('\n' + '=' .repeat(60));
    console.log('\n✨ Testing Complete!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('\nStack trace:', error.stack);
  }
}

// Run the test
console.log('Starting AI File Naming SDK Test...\n');
testRealFiles().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
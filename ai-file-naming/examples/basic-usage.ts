/**
 * Basic usage example for AI File Naming SDK
 */

import { FileNamingSDK } from '../src';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    console.error('Please create a .env file with your API key or set the environment variable');
    process.exit(1);
  }

  // Initialize SDK with OpenAI provider
  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai',
      apiKey,
      model: 'gpt-4o',
      temperature: 0.7,
    },
    naming: {
      format: 'snake_case',
      maxLength: 80,
      sanitize: true,
    },
    batch: {
      concurrency: 5,
      retryFailedItems: true,
    },
    logging: {
      level: 'info',
      format: 'pretty',
    },
  });

  // Event listeners
  sdk.on('naming:start', (event: any) => {
    console.log(`Starting to name file: ${event.request.filePath}`);
  });

  sdk.on('naming:complete', (event: any) => {
    console.log(`✓ Named successfully in ${event.duration}ms`);
    console.log(`  Original: ${path.basename(event.request.filePath)}`);
    console.log(`  Suggested: ${event.response.suggestedName}`);
    console.log(`  Confidence: ${(event.response.confidence * 100).toFixed(1)}%`);
  });

  sdk.on('batch:progress', (event: any) => {
    const percentage = ((event.processed / event.total) * 100).toFixed(1);
    console.log(`Progress: ${event.processed}/${event.total} (${percentage}%)`);
  });

  // Test with a single file
  console.log('\n=== Single File Naming ===\n');

  try {
    // Test connection first
    console.log('Testing provider connection...');
    const isConnected = await sdk.testConnection();
    console.log(`Connection test: ${isConnected ? '✓ Success' : '✗ Failed'}`);

    // Example: Name a single file
    const testFile = '/Users/jinhu/Projects/AIO/AIO 注册材料';
    console.log(`\nNaming file: ${testFile}`);

    const result = await sdk.nameFile(testFile, {
      prompt: 'Generate a descriptive name for this file based on its content and purpose',
      caseFormat: 'snake_case',
    });

    console.log('\nNaming Result:');
    console.log(`  Original: ${result.originalName}`);
    console.log(`  Suggested: ${result.suggestedName}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    if (result.reasoning) {
      console.log(`  Reasoning: ${result.reasoning}`);
    }
  } catch (error) {
    console.error('Error naming file:', error);
  }

  // Test batch naming
  console.log('\n=== Batch File Naming ===\n');

  try {
    const testFolder = '/Users/jinhu/Projects/AIO/AIO 注册材料';
    console.log(`\nNaming all files in: ${testFolder}`);

    const batchResult = await sdk.nameBatch(testFolder, {
      concurrency: 3,
      continueOnError: true,
      caseFormat: 'kebab-case',
    });

    console.log('\nBatch Results:');
    console.log(`  Total processed: ${batchResult.totalProcessed}`);
    console.log(`  Successful: ${batchResult.totalSuccess}`);
    console.log(`  Failed: ${batchResult.totalFailed}`);
    console.log(`  Duration: ${batchResult.duration}ms`);

    if (batchResult.successful.length > 0) {
      console.log('\n  Successfully named files:');
      batchResult.successful.forEach((res) => {
        console.log(`    ${res.originalName} → ${res.suggestedName}`);
      });
    }

    if (batchResult.failed.length > 0) {
      console.log('\n  Failed files:');
      batchResult.failed.forEach((res) => {
        console.log(`    ${res.originalName}: ${res.error?.message}`);
      });
    }
  } catch (error) {
    console.error('Error in batch naming:', error);
  }

  // Test renaming (dry run)
  console.log('\n=== File Renaming (Dry Run) ===\n');

  try {
    const fileToRename = '/Users/jinhu/Projects/AIO/AIO 注册材料';
    console.log(`\nGenerating new name for: ${fileToRename}`);

    const renameResult = await sdk.renameFile(fileToRename, {
      dryRun: true,
      caseFormat: 'PascalCase',
      includeDate: true,
    });

    console.log('\nRename Preview (dry run):');
    console.log(`  Current path: ${renameResult.oldPath}`);
    console.log(`  New path: ${renameResult.newPath}`);
    console.log(`  New name: ${renameResult.newName}`);
  } catch (error) {
    console.error('Error in rename:', error);
  }

  // Show provider metrics
  console.log('\n=== Provider Metrics ===\n');
  const metrics = sdk.getProviderMetrics();
  if (metrics) {
    console.log('Provider Performance:');
    console.log(`  Total requests: ${metrics.totalRequests}`);
    console.log(`  Successful: ${metrics.successfulRequests}`);
    console.log(`  Failed: ${metrics.failedRequests}`);
    console.log(`  Average latency: ${metrics.averageLatency.toFixed(0)}ms`);
    console.log(`  Total tokens used: ${metrics.totalTokensUsed}`);
  }

  // Show cache stats
  console.log('\n=== Cache Statistics ===\n');
  console.log(`Cache size: ${sdk.getCacheSize()} items`);
}

// Run the example
main().catch(console.error);
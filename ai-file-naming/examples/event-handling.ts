/**
 * Example demonstrating event handling
 */

import { FileNamingSDK, EventName } from '../src';
import * as path from 'path';

async function demonstrateEvents() {
  console.log('📡 Event Handling Example\n');

  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
      model: 'gpt-4o',
      maxRetries: 3,
      timeout: 30000,
      temperature: 0.7,
    },
  });

  // Track processing statistics
  const stats = {
    filesProcessed: 0,
    successful: 0,
    failed: 0,
    totalTime: 0,
    totalTokens: 0,
  };

  // Listen to file analysis events
  sdk.on(EventName.FileAnalysisStart, (event: any) => {
    console.log(`\n🔍 Analyzing: ${path.basename(event.filePath)}`);
  });

  sdk.on(EventName.FileAnalysisComplete, (event: any) => {
    console.log(`   ✅ Type: ${event.result.fileType}, Size: ${(event.result.metadata.size / 1024).toFixed(2)} KB`);
  });

  // Listen to naming events
  sdk.on(EventName.NamingStart, (event: any) => {
    console.log(`   🤖 Generating name with ${event.provider}...`);
  });

  sdk.on(EventName.NamingComplete, (event: any) => {
    stats.successful++;
    stats.totalTime += event.duration;
    console.log(`   ✨ Suggested: "${event.response.suggestedName}"`);
    console.log(`   📊 Confidence: ${(event.response.confidence * 100).toFixed(0)}%, Time: ${event.duration}ms`);
  });

  sdk.on(EventName.NamingError, (event: any) => {
    stats.failed++;
    console.error(`   ❌ Error: ${event.error.message}`);
  });

  // Listen to provider events
  sdk.on(EventName.ProviderRequest, (event: any) => {
    console.log(`   📤 Request to ${event.provider}`);
  });

  sdk.on(EventName.ProviderResponse, (event: any) => {
    if (event.response?.usage) {
      stats.totalTokens += event.response.usage.totalTokens || 0;
      console.log(`   📥 Response: ${event.response.usage.totalTokens} tokens`);
    }
  });

  sdk.on(EventName.ProviderRateLimit, (event: any) => {
    console.warn(`   ⚠️  Rate limit hit for ${event.provider}`);
    if (event.resetAt) {
      console.warn(`   ⏰ Resets at: ${event.resetAt}`);
    }
  });

  // Listen to batch events
  sdk.on(EventName.BatchStart, (event: any) => {
    console.log(`\n📦 Batch started: ${event.totalFiles} files`);
  });

  sdk.on(EventName.BatchProgress, (event: any) => {
    const percentage = ((event.processed / event.total) * 100).toFixed(0);
    console.log(`   Progress: ${event.processed}/${event.total} (${percentage}%)`);
  });

  sdk.on(EventName.BatchComplete, (event: any) => {
    console.log(`\n✅ Batch complete:`);
    console.log(`   Total: ${event.totalFiles}`);
    console.log(`   Success: ${event.successful}`);
    console.log(`   Failed: ${event.failed}`);
    console.log(`   Duration: ${(event.duration / 1000).toFixed(2)}s`);
  });

  // Listen to cache events
  sdk.on(EventName.CacheHit, (event: any) => {
    console.log(`   ⚡ Cache hit! Skipping API call.`);
  });

  sdk.on(EventName.CacheMiss, (event: any) => {
    console.log(`   💾 Cache miss. Making API call...`);
  });

  // Listen to config updates
  sdk.on(EventName.ConfigUpdate, (event: any) => {
    console.log('\n⚙️  Configuration updated:', Object.keys(event.changes));
  });

  // Example: Process some files
  console.log('Processing test file...\n');

  try {
    const testFile = '/Users/jinhu/Projects/AIO/AIO 注册材料/AIO Manufacturing Solution LLC LOA.pdf';

    // First call - should be a cache miss
    await sdk.nameFile(testFile);
    stats.filesProcessed++;

    // Second call - should be a cache hit
    console.log('\n--- Calling again (should use cache) ---\n');
    await sdk.nameFile(testFile);
    stats.filesProcessed++;

    // Update config (will trigger event)
    console.log('\n--- Updating configuration ---\n');
    await sdk.updateConfig({
      naming: {
        format: 'kebab-case',
        maxLength: 50,
        sanitize: true,
        replaceSpaces: '-',
        removeSpecialChars: true,
      },
    });

    // Show final statistics
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Session Statistics\n');
    console.log(`   Files Processed: ${stats.filesProcessed}`);
    console.log(`   Successful: ${stats.successful}`);
    console.log(`   Failed: ${stats.failed}`);
    console.log(`   Average Time: ${stats.successful > 0 ? (stats.totalTime / stats.successful).toFixed(0) : 0}ms`);
    console.log(`   Total Tokens: ${stats.totalTokens}`);
    console.log(`   Cache Size: ${sdk.getCacheSize()}`);

    console.log('\n✨ Event handling example complete!\n');
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

demonstrateEvents().catch(console.error);
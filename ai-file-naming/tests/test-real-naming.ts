/**
 * Real AI naming test with actual OpenAI API calls
 * Tests the full naming pipeline with optimization
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileNamingSDK, initializeProviders } from '../src/index';

// Load environment variables
dotenv.config();

// Initialize providers
initializeProviders();

async function main() {
  console.log('🤖 Testing Real AI File Naming with GPT-5\n');

  // Check for API key
  const apiKey = process.env['OPEN_AI_API_KEY'] || process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    console.error('❌ Error: OPEN_AI_API_KEY not set');
    process.exit(1);
  }

  console.log('✅ API Key loaded');
  console.log(`   Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

  // Initialize SDK with GPT-5-mini
  console.log('⚙️  Initializing FileNamingSDK...');
  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai' as const,
      apiKey,
      model: 'gpt-5-mini',
      maxRetries: 3,
      timeout: 30000,
      temperature: 0.7,
    },
  });

  console.log('✅ SDK initialized with GPT-5-mini\n');

  // Create test directory and files
  const testDir = path.join(__dirname, 'test-files');
  await fs.mkdir(testDir, { recursive: true });

  // Test File 1: Screenshot with timestamp
  console.log('═'.repeat(70));
  console.log('TEST 1: Screenshot File (should use metadata-only)');
  console.log('═'.repeat(70));

  const screenshotFile = path.join(testDir, 'Screenshot_2024_11_10_at_5.30.22_PM.png');
  await fs.writeFile(screenshotFile, Buffer.from('dummy screenshot'));

  console.log(`Original: ${path.basename(screenshotFile)}`);

  try {
    const result = await sdk.nameFile(screenshotFile);

    console.log(`✅ Suggested Name: ${result.suggestedName}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Provider: ${result.metadata?.['provider'] || 'unknown'}`);
    console.log();
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.log();
  }

  // Test File 2: Simple text document
  console.log('═'.repeat(70));
  console.log('TEST 2: Text Document');
  console.log('═'.repeat(70));

  const textFile = path.join(testDir, 'untitled.txt');
  const content = `AI File Naming SDK - Token Optimization Guide

This document explains how to reduce token usage by 90-95% through:
1. Front-loading content extraction
2. Minimal prompt engineering
3. Batch pattern recognition
4. Metadata-first processing
5. Multi-stage smart pipeline

Expected savings: $0.10 → $0.005 per file`;

  await fs.writeFile(textFile, content);

  console.log(`Original: ${path.basename(textFile)}`);
  console.log(`Content preview: ${content.substring(0, 80)}...`);

  try {
    const result = await sdk.nameFile(textFile);

    console.log(`✅ Suggested Name: ${result.suggestedName}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Provider: ${result.metadata?.['provider'] || 'unknown'}`);
    console.log();
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.log();
  }

  // Test File 3: PDF document (if pdf-parse is working)
  console.log('═'.repeat(70));
  console.log('TEST 3: Generic file (metadata-based)');
  console.log('═'.repeat(70));

  const genericFile = path.join(testDir, 'document_draft_final_v2.pdf');
  await fs.writeFile(genericFile, Buffer.from('%PDF-1.4\ndummy pdf content'));

  console.log(`Original: ${path.basename(genericFile)}`);

  try {
    const result = await sdk.nameFile(genericFile);

    console.log(`✅ Suggested Name: ${result.suggestedName}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Provider: ${result.metadata?.['provider'] || 'unknown'}`);
    console.log();
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.log();
  }

  // Cleanup
  console.log('🧹 Cleaning up test files...');
  await fs.rm(testDir, { recursive: true, force: true });

  console.log('✅ Test complete!\n');
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  console.error(error.stack);
  process.exit(1);
});

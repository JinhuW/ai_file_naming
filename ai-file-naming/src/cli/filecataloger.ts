#!/usr/bin/env node

/**
 * FileCataloger CLI - AI-powered file naming
 *
 * Usage: filecataloger <filepath>
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import OpenAI from 'openai';
import { EnhancedContentAnalyzer } from '../analyzers/EnhancedContentAnalyzer';

// Load environment variables
dotenv.config();

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('🤖 FileCataloger - AI File Naming\n');
    console.log('Usage: filecataloger <filepath>\n');
    console.log('Example:');
    console.log('  filecataloger /Users/jinhu/Desktop/document.pdf');
    console.log('  filecataloger ~/Downloads/photo.jpg\n');
    process.exit(0);
  }

  const filePath = args[0];
  if (!filePath) {
    console.error('❌ Error: No file path provided\n');
    process.exit(1);
  }

  // Check API key
  const apiKey = process.env['OPEN_AI_API_KEY'] || process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    console.error('❌ Error: OPEN_AI_API_KEY not set\n');
    console.log('Please set your OpenAI API key:');
    console.log('  export OPEN_AI_API_KEY=your-key-here\n');
    process.exit(1);
  }

  // Check if file exists
  try {
    await fs.access(filePath);
  } catch {
    console.error(`❌ Error: File not found: ${filePath}\n`);
    process.exit(1);
  }

  const filename = path.basename(filePath);
  const ext = path.extname(filePath);

  console.log('🤖 AI File Naming\n');
  console.log('═'.repeat(70));
  console.log(`File:     ${filename}`);
  console.log(`Path:     ${filePath}`);
  console.log('═'.repeat(70));
  console.log('\n📊 Analyzing content... ⏳\n');

  try {
    // Initialize analyzer and AI client
    const analyzer = new EnhancedContentAnalyzer();
    const client = new OpenAI({ apiKey });

    // Extract content
    const content = await analyzer.analyze(filePath);

    console.log('Content extracted:');
    console.log(`  ${content.summary}\n`);

    // Call AI
    console.log('🤖 Calling GPT-5-mini... ⏳\n');

    const response = await client.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'Generate a clear, descriptive filename based on content analysis. Return ONLY the filename without extension. Use snake_case or descriptive format.',
        },
        {
          role: 'user',
          content: `Original filename: ${filename}

Content Analysis:
${content.summary}

Details:
${content.details.slice(0, 5).join('\n')}

Key terms: ${content.keywords.slice(0, 8).join(', ')}

Generate a specific, meaningful filename that captures the actual content (not generic like "data" or "test"). Be descriptive about what this file contains.`,
        },
      ],
      max_completion_tokens: 500,
    });

    const suggestedName = response.choices[0]?.message?.content?.trim() || filename;

    // Display results
    console.log('✅ Analysis Complete!\n');
    console.log('═'.repeat(70));
    console.log(`Original:     ${filename}`);
    console.log(`Suggested:    ${suggestedName}${ext}`);
    console.log(`Confidence:   ${(content.confidence * 100).toFixed(0)}%`);
    console.log(`Tokens:       ${response.usage?.total_tokens || 0} (${response.usage?.prompt_tokens}p + ${response.usage?.completion_tokens}c)`);
    console.log(`Cost:         $${(((response.usage?.total_tokens || 0) * 0.25) / 1_000_000).toFixed(6)}`);
    console.log('═'.repeat(70));
    console.log();

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}\n`);
    if (error.code === 'ENOENT') {
      console.error('File not found or cannot be read.\n');
    } else if (error.status === 401) {
      console.error('Invalid API key. Please check your OPEN_AI_API_KEY.\n');
    } else if (error.status) {
      console.error(`API Error (${error.status}): ${error.message}\n`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

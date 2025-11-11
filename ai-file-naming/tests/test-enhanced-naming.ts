/**
 * Test enhanced content extraction for better AI naming
 */

import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { EnhancedContentAnalyzer } from '../src/analyzers/EnhancedContentAnalyzer';

dotenv.config();

async function testFile(filePath: string, filename: string) {
  const apiKey = process.env['OPEN_AI_API_KEY'] || process.env['OPENAI_API_KEY'];
  if (!apiKey) throw new Error('API key not found');

  const client = new OpenAI({ apiKey });
  const analyzer = new EnhancedContentAnalyzer();

  console.log(`\n📄 Testing: ${filename}`);
  console.log('═'.repeat(70));

  // Extract enhanced content
  console.log('🔍 Extracting content...');
  const content = await analyzer.analyze(filePath);

  console.log(`\nExtracted content:`);
  console.log(`  Summary: ${content.summary}`);
  console.log(`  Details: ${content.details.join(' | ')}`);
  console.log(`  Keywords: ${content.keywords.slice(0, 5).join(', ')}`);
  console.log(`  Confidence: ${(content.confidence * 100).toFixed(0)}%`);

  // Create optimized prompt
  console.log(`\n🤖 Calling GPT-5-mini with enhanced prompt...`);

  const response = await client.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a file naming expert. Generate a descriptive filename based on the content analysis. Return ONLY the filename without extension. Use snake_case or descriptive format.',
      },
      {
        role: 'user',
        content: `File: ${filename}

Content Analysis:
${content.summary}

Details:
${content.details.join('\n')}

Key terms: ${content.keywords.slice(0, 8).join(', ')}

Based on this analysis, suggest a clear, descriptive filename that captures the main purpose and content of this file. The name should be specific and meaningful, not generic.`,
      },
    ],
    max_completion_tokens: 500,
  });

  console.log(`\n✅ AI Response:`);
  console.log('─'.repeat(70));
  console.log(`Suggested name: ${response.choices[0]?.message?.content}`);
  console.log(`Model: ${response.model}`);
  console.log(`Tokens: ${response.usage?.total_tokens} (${response.usage?.prompt_tokens} + ${response.usage?.completion_tokens})`);
  console.log(`Cost: $${((response.usage?.total_tokens || 0) * 0.25 / 1_000_000).toFixed(6)}`);
  console.log('═'.repeat(70));
}

async function main() {
  console.log('🚀 Testing Enhanced Content Analysis for Better Naming\n');

  // Test Excel file
  await testFile(
    '/Users/jinhu/Desktop/Tungsung 25.9.22.xlsx',
    'Tungsung 25.9.22.xlsx'
  );

  // Test Video file
  await testFile(
    '/Users/jinhu/Desktop/test.mov',
    'test.mov'
  );

  console.log('\n✅ All tests complete!\n');
}

main().catch(console.error);

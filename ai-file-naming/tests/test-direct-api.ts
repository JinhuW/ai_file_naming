/**
 * Direct OpenAI API test with GPT-5-mini
 */

import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import pdfParse from 'pdf-parse';

dotenv.config();

async function main() {
  const apiKey = process.env['OPEN_AI_API_KEY'] || process.env['OPENAI_API_KEY'];

  if (!apiKey) {
    console.error('❌ API key not found');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey });

  console.log('📄 Testing: /Users/jinhu/Desktop/SEW全球网点.pdf\n');

  // Read and parse PDF
  const pdfPath = '/Users/jinhu/Desktop/SEW全球网点.pdf';
  const dataBuffer = await fs.readFile(pdfPath);
  const pdfData = await pdfParse(dataBuffer);

  console.log(`PDF Info:`);
  console.log(`  Pages: ${pdfData.numpages}`);
  console.log(`  Text length: ${pdfData.text.length} characters`);
  console.log(`\nFirst 500 characters:`);
  console.log('─'.repeat(70));
  console.log(pdfData.text.slice(0, 500));
  console.log('─'.repeat(70));
  console.log();

  // Call GPT-5-mini
  console.log('🤖 Calling GPT-5-mini API...\n');

  const response = await client.chat.completions.create({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: 'Generate a descriptive filename. Return only the filename, no extension. Use snake_case format.',
      },
      {
        role: 'user',
        content: `Type: pdf. Content: ${pdfData.text.slice(0, 500)}. Suggest filename:`,
      },
    ],
    max_completion_tokens: 500,  // GPT-5 needs tokens for both reasoning and output
    // temperature: 0.7,  // GPT-5 only supports default temperature (1)
  });

  console.log('✅ Response received!\n');
  console.log('Full response:', JSON.stringify(response, null, 2));
  console.log('\n' + '═'.repeat(70));
  console.log(`Model used: ${response.model}`);
  console.log(`Suggested name: "${response.choices[0]?.message?.content}"`);
  console.log(`Finish reason: ${response.choices[0]?.finish_reason}`);
  console.log(`Tokens used: ${response.usage?.total_tokens}`);
  console.log(`  - Prompt: ${response.usage?.prompt_tokens}`);
  console.log(`  - Completion: ${response.usage?.completion_tokens}`);
  console.log(`Cost: $${((response.usage?.total_tokens || 0) * 0.25 / 1_000_000).toFixed(6)}`);
  console.log('═'.repeat(70));
}

main().catch(console.error);

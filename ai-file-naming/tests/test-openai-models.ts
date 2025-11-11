/**
 * Test OpenAI connection and list available models
 */

import * as dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

async function main() {
  const apiKey = process.env['OPEN_AI_API_KEY'] || process.env['OPENAI_API_KEY'];

  if (!apiKey) {
    console.error('❌ OPEN_AI_API_KEY not set');
    process.exit(1);
  }

  console.log('🔑 API Key found\n');

  const client = new OpenAI({ apiKey });

  console.log('📋 Testing OpenAI API connection...\n');

  try {
    // Try to list models
    console.log('Fetching available models...');
    const models = await client.models.list();

    console.log(`\n✅ Found ${models.data.length} models\n`);

    // Filter for GPT models
    const gptModels = models.data.filter(m => m.id.includes('gpt')).map(m => m.id);

    console.log('GPT Models available:');
    gptModels.forEach(model => {
      console.log(`  - ${model}`);
    });

    console.log('\n📝 Testing a simple chat completion with gpt-5-mini...\n');

    // Test with gpt-5-mini
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'Generate a filename. snake_case. No extension.' },
          { role: 'user', content: 'Photo: sunset beach. Name:' },
        ],
        max_tokens: 50,
        temperature: 0.7,
      });

      console.log('✅ GPT-5-mini test successful!');
      console.log(`Model used: ${response.model}`);
      console.log(`Response: ${response.choices[0]?.message?.content}`);
      console.log(`Tokens: ${response.usage?.total_tokens}`);
    } catch (error: any) {
      console.error(`❌ GPT-5-mini test failed: ${error.message}`);

      // Try with gpt-4o as fallback to verify API works
      console.log('\n📝 Testing with gpt-4o as fallback...\n');
      const fallbackResponse = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Generate a filename. snake_case. No extension.' },
          { role: 'user', content: 'Photo: sunset beach. Name:' },
        ],
        max_tokens: 50,
      });

      console.log('✅ Fallback test successful!');
      console.log(`Model used: ${fallbackResponse.model}`);
      console.log(`Response: ${fallbackResponse.choices[0]?.message?.content}`);
      console.log(`Tokens: ${fallbackResponse.usage?.total_tokens}`);
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

main().catch(console.error);

/**
 * Example demonstrating all AI providers
 */

import { FileNamingSDK, ProviderRegistry } from '../src';

async function demonstrateAllProviders() {
  console.log('🤖 AI File Naming SDK - All Providers Demo\n');
  console.log('Available providers:', ProviderRegistry.getAvailable());
  console.log('\n' + '='.repeat(60) + '\n');

  const testFile = '/Users/jinhu/Projects/AIO/AIO 注册材料/AIO Manufacturing Solution LLC LOA.pdf';

  // Example 1: OpenAI Provider
  console.log('1️⃣  OpenAI Provider (GPT-4o)\n');

  const openaiSDK = new FileNamingSDK({
    provider: {
      type: 'openai',
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
      model: 'gpt-4o',
    },
    naming: {
      format: 'snake_case',
    },
  });

  try {
    const result = await openaiSDK.nameFile(testFile, {
      prompt: 'Generate a professional filename for this business document',
    });
    console.log(`   Original: ${result.originalName}`);
    console.log(`   Suggested: ${result.suggestedName}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%\n`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Example 2: Ollama Provider (Local)
  console.log('2️⃣  Ollama Provider (Local - llava)\n');

  const ollamaSDK = new FileNamingSDK({
    provider: {
      type: 'ollama',
      model: 'llava',
      baseURL: 'http://localhost:11434',
      maxRetries: 3,
      timeout: 30000,
      temperature: 0.7,
    },
    naming: {
      format: 'kebab-case',
    },
  });

  try {
    const connected = await ollamaSDK.testConnection();
    if (connected) {
      const result = await ollamaSDK.nameFile(testFile, {
        prompt: 'Analyze this file and suggest a clear, descriptive filename',
      });
      console.log(`   Original: ${result.originalName}`);
      console.log(`   Suggested: ${result.suggestedName}`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%\n`);
    } else {
      console.log('   ⚠️  Ollama not running. Start it with: ollama serve\n');
    }
  } catch (error: any) {
    console.log(`   ℹ️  ${error.message}\n`);
  }

  // Example 3: Anthropic Provider (Claude)
  console.log('3️⃣  Anthropic Provider (Claude 3)\n');

  const anthropicSDK = new FileNamingSDK({
    provider: {
      type: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || 'your-api-key-here',
      model: 'claude-3-opus-20240229',
      maxRetries: 3,
      timeout: 30000,
      temperature: 0.7,
    },
    naming: {
      format: 'PascalCase',
    },
  });

  try {
    const result = await anthropicSDK.nameFile(testFile, {
      prompt: 'Create a descriptive filename for this file',
    });
    console.log(`   Original: ${result.originalName}`);
    console.log(`   Suggested: ${result.suggestedName}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%\n`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Example 4: Gemini Provider
  console.log('4️⃣  Gemini Provider (Google)\n');

  const geminiSDK = new FileNamingSDK({
    provider: {
      type: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || 'your-api-key-here',
      model: 'gemini-pro-vision',
      maxRetries: 3,
      timeout: 30000,
      temperature: 0.7,
    },
    naming: {
      format: 'camelCase',
    },
  });

  try {
    const result = await geminiSDK.nameFile(testFile, {
      prompt: 'Suggest an appropriate filename for this file',
    });
    console.log(`   Original: ${result.originalName}`);
    console.log(`   Suggested: ${result.suggestedName}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(0)}%\n`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  console.log('='.repeat(60));
  console.log('\n✨ Demo complete! The SDK supports all major AI providers.\n');
}

// Run the demo
demonstrateAllProviders().catch(console.error);
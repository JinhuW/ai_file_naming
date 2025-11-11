/**
 * Debug test for AI File Naming SDK
 */

import { FileNamingSDK, EventName } from './src';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugTest() {
  console.log('🔍 Debug Test for AI File Naming SDK\n');

  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    console.error('Please create a .env file with your API key or set the environment variable');
    process.exit(1);
  }

  // Initialize SDK with debug logging
  const sdk = new FileNamingSDK({
    provider: {
      type: 'openai',
      apiKey,
      model: 'gpt-4o',
      maxRetries: 3,
      timeout: 60000,
      temperature: 0.7,
    },
    logging: {
      level: 'debug',
      format: 'pretty',
    },
  });

  // Add detailed event listeners
  sdk.on(EventName.ProviderRequest, (event: any) => {
    console.log('\n📤 Provider Request:', {
      provider: event.provider,
      hasPrompt: !!event.prompt,
      timestamp: event.timestamp,
    });
  });

  sdk.on(EventName.ProviderResponse, (event: any) => {
    console.log('\n📥 Provider Response:', {
      provider: event.provider,
      duration: event.duration,
      hasResponse: !!event.response,
      usage: event.response?.usage,
    });
  });

  sdk.on(EventName.ProviderError, (event: any) => {
    console.error('\n❌ Provider Error:', {
      provider: event.provider,
      error: event.error,
      retryable: event.retryable,
    });
  });

  sdk.on(EventName.FileAnalysisStart, (event: any) => {
    console.log('\n🔍 Analyzing file:', event.filePath);
  });

  sdk.on(EventName.FileAnalysisComplete, (event: any) => {
    console.log('✅ Analysis complete:', {
      fileType: event.result?.fileType,
      mimeType: event.result?.metadata?.mimeType,
      size: event.result?.metadata?.size,
    });
  });

  try {
    // Test with a simple text file first
    console.log('Testing connection...\n');
    const connected = await sdk.testConnection();
    console.log('Connection test result:', connected);

    if (!connected) {
      console.error('\n❌ Failed to connect to OpenAI');

      // Try to get more details
      const status = sdk.getProviderStatus();
      console.log('\nProvider Status:', status);

      return;
    }

    // Test with the image
    const testFile = '/Users/jinhu/Projects/AIO/AIO 注册材料/AIO公司注册/费用报销/公司注册/ITIN 淘宝.jpg';
    console.log(`\n📸 Testing with image: ${testFile}\n`);

    const result = await sdk.nameFile(testFile, {
      prompt: 'Look at this image and describe what you see, then suggest a descriptive filename.',
      caseFormat: 'snake_case',
    });

    console.log('\n📊 Final Result:');
    console.log(JSON.stringify(result, null, 2));

    // Get detailed metrics
    const metrics = sdk.getProviderMetrics();
    console.log('\n📈 Provider Metrics:');
    console.log(JSON.stringify(metrics, null, 2));

    // Check for errors
    if (metrics?.errors && metrics.errors.length > 0) {
      console.log('\n⚠️ Recorded Errors:');
      metrics.errors.forEach((err: any) => {
        console.log(`  - ${err.timestamp}: ${err.error}`);
        if (err.context) {
          console.log('    Context:', err.context);
        }
      });
    }

  } catch (error: any) {
    console.error('\n💥 Fatal Error:', error);
    console.error('Stack:', error.stack);
  }
}

debugTest().catch(console.error);
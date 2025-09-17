// SDK Usage Examples for Sensitive Word Detection

import {
  SensitiveWordClient,
  createClient,
  defaultClient,
  detectTexts,
  withRetry,
  SensitiveWordError
} from '../src/sdk/client';

// Example 1: Basic Client Setup
async function basicUsage() {
  console.log('=== Basic Usage ===');

  // Create client with custom configuration
  const client = createClient({
    baseURL: 'http://localhost:3000',
    timeout: 10000,
  });

  try {
    // Simple detection
    const result = await client.detect('今天天气不错，适合出去走走');
    console.log('Detection result:', result.result?.level);
    console.log('Reason:', result.result?.reason);
    console.log('Confidence:', result.result?.confidence);

  } catch (error) {
    console.error('Detection failed:', error);
  }
}

// Example 2: Azure Configuration
async function azureUsage() {
  console.log('=== Azure Usage ===');

  const client = createClient({
    baseURL: 'http://localhost:3000',
    timeout: 15000,
    defaultAzureConfig: {
      endpoint: 'https://your-resource.cognitiveservices.azure.com/contentsafety/text:analyze?api-version=2023-10-01',
      subscriptionKey: 'your-subscription-key',
    },
  });

  try {
    // Detection with Azure
    const result = await client.detect('Test content for Azure detection', {
      useAzure: true,
    });

    console.log('Combined detection result:', result.result?.level);
    console.log('Azure analysis available:', result.result?.details?.azure?.available);

    // Azure-only detection
    const azureOnly = await client.detectAzure('Another test content');
    console.log('Azure-only result:', azureOnly.result?.level);

  } catch (error) {
    console.error('Azure detection failed:', error);
  }
}

// Example 3: Batch Detection
async function batchUsage() {
  console.log('=== Batch Usage ===');

  const client = createClient({
    baseURL: 'http://localhost:3000',
  });

  const texts = [
    '今天天气很好',
    '这是一个测试文本',
    '你这个傻逼', // This should be flagged
    'Hello world',
    '政府的管理水平需要提升',
  ];

  try {
    // Batch detection using client method
    const results = await client.detectBatch(texts);

    console.log('Batch results:');
    results.forEach((result, index) => {
      console.log(`Text ${index + 1}: ${result.result?.level} (${result.result?.confidence})`);
    });

    // Batch detection using utility function
    const detailedResults = await detectTexts(texts, client);

    console.log('\nDetailed batch results:');
    detailedResults.forEach((result) => {
      console.log(`"${result.text}" -> ${result.result?.level}`);
    });

  } catch (error) {
    console.error('Batch detection failed:', error);
  }
}

// Example 4: Local vs Azure Comparison
async function comparisonUsage() {
  console.log('=== Local vs Azure Comparison ===');

  const client = createClient({
    baseURL: 'http://localhost:3000',
    defaultAzureConfig: {
      endpoint: process.env.AZURE_ENDPOINT || '',
      subscriptionKey: process.env.AZURE_KEY || '',
    },
  });

  const testTexts = [
    '你这个傻逼', // Chinese curse - local should catch
    'I hate you so much', // English hate - Azure should catch
    '今天天气不错', // Safe content
  ];

  for (const text of testTexts) {
    console.log(`\nAnalyzing: "${text}"`);

    try {
      // Local detection
      const localResult = await client.detectLocal(text);
      console.log(`Local: ${localResult.result?.level} (${localResult.result?.confidence})`);

      // Azure detection (if configured)
      if (process.env.AZURE_ENDPOINT && process.env.AZURE_KEY) {
        const azureResult = await client.detectAzure(text);
        console.log(`Azure: ${azureResult.result?.level} (${azureResult.result?.confidence})`);
      }

      // Combined detection
      const combinedResult = await client.detect(text, { useAzure: true });
      console.log(`Combined: ${combinedResult.result?.level} (triggered by: ${combinedResult.result?.details?.finalDecision?.triggeredBy})`);

    } catch (error) {
      console.error(`Error analyzing "${text}":`, error);
    }
  }
}

// Example 5: Error Handling and Retry
async function errorHandlingUsage() {
  console.log('=== Error Handling ===');

  // Client with short timeout to demonstrate errors
  const client = createClient({
    baseURL: 'http://localhost:3000',
    timeout: 100, // Very short timeout
  });

  try {
    // This might timeout
    const result = await client.detect('Test content');
    console.log('Result:', result.result?.level);
  } catch (error) {
    console.log('Expected timeout error:', error.message);
  }

  // Using retry utility
  try {
    const result = await withRetry(
      () => defaultClient.detect('Test content with retry'),
      3, // max retries
      1000 // delay between retries
    );
    console.log('Retry successful:', result.result?.level);
  } catch (error) {
    console.error('All retries failed:', error);
  }
}

// Example 6: Health Check and Connection Testing
async function healthCheckUsage() {
  console.log('=== Health Check ===');

  const client = createClient({
    baseURL: 'http://localhost:3000',
  });

  try {
    // Test connection
    const isConnected = await client.testConnection();
    console.log('Connection test:', isConnected ? 'PASSED' : 'FAILED');

    // Get health status
    const health = await client.health();
    console.log('Health status:', health.status);
    console.log('Local service:', health.services.local ? 'UP' : 'DOWN');
    console.log('Azure service:', health.services.azure ? 'UP' : 'DOWN');

    // Get API info
    const info = await client.info();
    console.log('API version:', info.version);
    console.log('Available endpoints:', Object.keys(info.endpoints));

    // Get statistics
    const stats = await client.stats();
    console.log('Server uptime:', stats.stats.uptime + 's');
    console.log('Memory usage:', Math.round(stats.stats.memory.heapUsed / 1024 / 1024) + 'MB');

  } catch (error) {
    console.error('Health check failed:', error);
  }
}

// Example 7: Custom Error Handling
async function customErrorHandling() {
  console.log('=== Custom Error Handling ===');

  const client = createClient({
    baseURL: 'http://localhost:3000',
  });

  try {
    // This should fail - empty text
    await client.detect('');
  } catch (error) {
    if (error instanceof SensitiveWordError) {
      console.log('Custom error code:', error.code);
      console.log('Error details:', error.details);
    } else {
      console.log('Standard error:', error.message);
    }
  }
}

// Example 8: Configuration Management
async function configurationManagement() {
  console.log('=== Configuration Management ===');

  const client = createClient({
    baseURL: 'http://localhost:3000',
  });

  // Get current configuration
  const config = client.getConfig();
  console.log('Current base URL:', config.baseURL);
  console.log('Current timeout:', config.timeout);

  // Set Azure configuration dynamically
  client.setDefaultAzureConfig({
    endpoint: 'https://new-endpoint.cognitiveservices.azure.com/contentsafety/text:analyze?api-version=2023-10-01',
    subscriptionKey: 'new-key',
  });

  console.log('Azure config updated');

  // Detect with new Azure config
  try {
    const result = await client.detect('Test with new config', { useAzure: true });
    console.log('Detection with new config:', result.result?.level);
  } catch (error) {
    console.log('Detection failed (expected if no real Azure config):', error.message);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Starting SDK Usage Examples\n');

  const examples = [
    basicUsage,
    azureUsage,
    batchUsage,
    comparisonUsage,
    errorHandlingUsage,
    healthCheckUsage,
    customErrorHandling,
    configurationManagement,
  ];

  for (const example of examples) {
    try {
      await example();
      console.log('✅ Example completed\n');
    } catch (error) {
      console.error('❌ Example failed:', error.message);
      console.log('');
    }
  }

  console.log('🎉 All examples completed!');
}

// Export for use as module
export {
  basicUsage,
  azureUsage,
  batchUsage,
  comparisonUsage,
  errorHandlingUsage,
  healthCheckUsage,
  customErrorHandling,
  configurationManagement,
  runAllExamples,
};

// Run examples if this file is executed directly
if (import.meta.main) {
  runAllExamples().catch(console.error);
}
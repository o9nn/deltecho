/**
 * Basic UnifiedLLMService Usage Example
 * 
 * This example demonstrates how to initialize and use the UnifiedLLMService
 * for cognitive AI processing with the triadic architecture.
 * 
 * Prerequisites:
 * - Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable
 * - Run: pnpm build (to compile the packages)
 * 
 * Usage:
 * - npx ts-node examples/basic-llm-usage.ts
 */

import {
  UnifiedLLMService,
  CognitiveFunction,
  LLMProviderRegistry,
  OpenAIProvider,
  AnthropicProvider,
} from '../deep-tree-echo-core/src/cognitive/providers/index.js';

async function main() {
  console.log('🧠 Deltecho Cognitive AI - Basic Usage Example\n');
  console.log('='.repeat(60) + '\n');

  // Check for API keys
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiKey && !anthropicKey) {
    console.error('❌ Error: No API keys found!');
    console.error('Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.');
    console.error('\nExample:');
    console.error('  export OPENAI_API_KEY="sk-..."');
    console.error('  export ANTHROPIC_API_KEY="sk-ant-..."');
    process.exit(1);
  }

  // Initialize the provider registry
  const registry = LLMProviderRegistry.getInstance();

  // Register available providers
  if (openaiKey) {
    console.log('✅ OpenAI API key detected');
    registry.register(new OpenAIProvider({
      apiKey: openaiKey,
      model: 'gpt-4-turbo-preview',
    }));
  }

  if (anthropicKey) {
    console.log('✅ Anthropic API key detected');
    registry.register(new AnthropicProvider({
      apiKey: anthropicKey,
      model: 'claude-3-sonnet-20240229',
    }));
  }

  // Determine default provider
  const defaultProvider = openaiKey ? 'openai' : 'anthropic';
  console.log(`\n📍 Using ${defaultProvider} as default provider\n`);

  // Initialize the UnifiedLLMService
  const llmService = new UnifiedLLMService({
    defaultProvider,
    registry,
  });

  await llmService.initialize();
  console.log('✅ UnifiedLLMService initialized\n');

  // Example 1: Basic Cognitive Core Processing
  console.log('─'.repeat(60));
  console.log('📊 Example 1: Cognitive Core (Logical Reasoning)');
  console.log('─'.repeat(60));

  const cognitivePrompt = 'Analyze the key factors that determine the success of an AI startup.';
  console.log(`\nPrompt: "${cognitivePrompt}"\n`);

  try {
    const cognitiveResponse = await llmService.process(
      cognitivePrompt,
      CognitiveFunction.COGNITIVE_CORE
    );
    console.log('Response:\n');
    console.log(cognitiveResponse.content);
    console.log(`\n[Tokens: ${cognitiveResponse.usage?.totalTokens || 'N/A'}]`);
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 2: Affective Core Processing
  console.log('\n' + '─'.repeat(60));
  console.log('💭 Example 2: Affective Core (Emotional Understanding)');
  console.log('─'.repeat(60));

  const affectivePrompt = 'How might employees feel about a sudden shift to fully remote work?';
  console.log(`\nPrompt: "${affectivePrompt}"\n`);

  try {
    const affectiveResponse = await llmService.process(
      affectivePrompt,
      CognitiveFunction.AFFECTIVE_CORE
    );
    console.log('Response:\n');
    console.log(affectiveResponse.content);
    console.log(`\n[Tokens: ${affectiveResponse.usage?.totalTokens || 'N/A'}]`);
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 3: Relevance Core Processing
  console.log('\n' + '─'.repeat(60));
  console.log('🎯 Example 3: Relevance Core (Integration & Salience)');
  console.log('─'.repeat(60));

  const relevancePrompt = 'Given limited resources, what should a new AI company prioritize first?';
  console.log(`\nPrompt: "${relevancePrompt}"\n`);

  try {
    const relevanceResponse = await llmService.process(
      relevancePrompt,
      CognitiveFunction.RELEVANCE_CORE
    );
    console.log('Response:\n');
    console.log(relevanceResponse.content);
    console.log(`\n[Tokens: ${relevanceResponse.usage?.totalTokens || 'N/A'}]`);
  } catch (error) {
    console.error('Error:', error);
  }

  // Example 4: Provider Health Check
  console.log('\n' + '─'.repeat(60));
  console.log('🏥 Example 4: Provider Health Status');
  console.log('─'.repeat(60));

  const health = await llmService.getProviderHealth();
  console.log('\nProvider Status:');
  for (const [provider, status] of Object.entries(health)) {
    console.log(`  ${provider}: ${status.available ? '✅ Available' : '❌ Unavailable'} (${status.latency}ms)`);
  }

  // Cleanup
  await llmService.shutdown();
  console.log('\n✅ Service shutdown complete');
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Example completed successfully!');
}

main().catch(console.error);

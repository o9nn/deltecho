/**
 * Triadic Cognitive Loop Example
 * 
 * This example demonstrates the full triadic cognitive architecture
 * with parallel processing across all three cognitive cores:
 * - Cognitive Core: Logical reasoning and analysis
 * - Affective Core: Emotional understanding and empathy
 * - Relevance Core: Integration, salience, and prioritization
 * 
 * The three cores process in parallel (120° phase separation)
 * following the 12-step cognitive loop architecture.
 * 
 * Prerequisites:
 * - Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable
 * 
 * Usage:
 * - npx ts-node examples/triadic-cognitive-loop.ts
 */

import {
  UnifiedLLMService,
  CognitiveFunction,
  LLMProviderRegistry,
  OpenAIProvider,
  AnthropicProvider,
} from '../deep-tree-echo-core/src/cognitive/providers/index.js';

interface TriadicResponse {
  cognitive: string;
  affective: string;
  relevance: string;
  synthesis: string;
  processingTime: number;
}

async function processTriadic(
  llmService: UnifiedLLMService,
  prompt: string
): Promise<TriadicResponse> {
  const startTime = Date.now();

  console.log('\n🔄 Processing through triadic cognitive architecture...\n');

  // Process all three cores in parallel (simulating 120° phase separation)
  const [cognitiveResult, affectiveResult, relevanceResult] = await Promise.all([
    llmService.process(prompt, CognitiveFunction.COGNITIVE_CORE),
    llmService.process(prompt, CognitiveFunction.AFFECTIVE_CORE),
    llmService.process(prompt, CognitiveFunction.RELEVANCE_CORE),
  ]);

  // Synthesize the three perspectives
  const synthesisPrompt = `
You are the integration layer of a triadic cognitive system. 
Synthesize the following three perspectives into a unified, coherent response:

## Cognitive Analysis (Logical Reasoning):
${cognitiveResult.content}

## Affective Analysis (Emotional Understanding):
${affectiveResult.content}

## Relevance Analysis (Salience & Priority):
${relevanceResult.content}

Provide a balanced synthesis that integrates all three perspectives into actionable insights.
`;

  const synthesisResult = await llmService.process(
    synthesisPrompt,
    CognitiveFunction.RELEVANCE_CORE
  );

  const processingTime = Date.now() - startTime;

  return {
    cognitive: cognitiveResult.content,
    affective: affectiveResult.content,
    relevance: relevanceResult.content,
    synthesis: synthesisResult.content,
    processingTime,
  };
}

async function main() {
  console.log('🧠 Deltecho Triadic Cognitive Loop Example\n');
  console.log('='.repeat(70) + '\n');

  // Check for API keys
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiKey && !anthropicKey) {
    console.error('❌ Error: No API keys found!');
    console.error('Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.');
    process.exit(1);
  }

  // Initialize providers
  const registry = LLMProviderRegistry.getInstance();

  if (openaiKey) {
    registry.register(new OpenAIProvider({
      apiKey: openaiKey,
      model: 'gpt-4-turbo-preview',
    }));
  }

  if (anthropicKey) {
    registry.register(new AnthropicProvider({
      apiKey: anthropicKey,
      model: 'claude-3-sonnet-20240229',
    }));
  }

  const defaultProvider = openaiKey ? 'openai' : 'anthropic';

  // Initialize service
  const llmService = new UnifiedLLMService({
    defaultProvider,
    registry,
  });

  await llmService.initialize();
  console.log('✅ Triadic Cognitive System initialized\n');

  // Example scenario: Strategic decision making
  const scenario = `
A technology company is considering whether to pivot from their current B2B SaaS product 
to focus on AI-powered consumer applications. They have 18 months of runway, a team of 
25 engineers, and their current product generates $2M ARR but growth has stagnated at 5% YoY.
Should they pivot?
`;

  console.log('─'.repeat(70));
  console.log('📋 SCENARIO');
  console.log('─'.repeat(70));
  console.log(scenario);

  // Process through triadic architecture
  const result = await processTriadic(llmService, scenario);

  // Display results
  console.log('\n' + '═'.repeat(70));
  console.log('📊 COGNITIVE CORE ANALYSIS (Logical Reasoning)');
  console.log('═'.repeat(70));
  console.log(result.cognitive);

  console.log('\n' + '═'.repeat(70));
  console.log('💭 AFFECTIVE CORE ANALYSIS (Emotional Understanding)');
  console.log('═'.repeat(70));
  console.log(result.affective);

  console.log('\n' + '═'.repeat(70));
  console.log('🎯 RELEVANCE CORE ANALYSIS (Salience & Priority)');
  console.log('═'.repeat(70));
  console.log(result.relevance);

  console.log('\n' + '═'.repeat(70));
  console.log('🔮 INTEGRATED SYNTHESIS');
  console.log('═'.repeat(70));
  console.log(result.synthesis);

  console.log('\n' + '─'.repeat(70));
  console.log(`⏱️  Total Processing Time: ${result.processingTime}ms`);
  console.log('─'.repeat(70));

  // Cleanup
  await llmService.shutdown();
  console.log('\n✅ Triadic cognitive loop complete!');
}

main().catch(console.error);

#!/usr/bin/env npx ts-node
/**
 * Deltecho CLI - Command Line Interface for Cognitive AI Testing
 *
 * A comprehensive CLI tool for interacting with the Deltecho cognitive AI system.
 * Supports triadic processing, 12-step cognitive cycles, and provider management.
 *
 * Usage:
 *   npx ts-node bin/deltecho-cli.ts [command] [options]
 *
 * Commands:
 *   chat         - Interactive chat with the cognitive AI
 *   triadic      - Process input through all three cognitive cores
 *   cognitive    - Process through Cognitive Core only
 *   affective    - Process through Affective Core only
 *   relevance    - Process through Relevance Core only
 *   cycle        - Run full 12-step cognitive cycle
 *   status       - Show provider status and configuration
 *   help         - Show this help message
 *
 * Environment Variables:
 *   OPENAI_API_KEY     - OpenAI API key
 *   ANTHROPIC_API_KEY  - Anthropic API key
 *   DEFAULT_PROVIDER   - Default provider (openai or anthropic)
 */

import * as readline from 'readline';

// Types
enum CognitiveFunction {
  COGNITIVE_CORE = 'cognitive_core',
  AFFECTIVE_CORE = 'affective_core',
  RELEVANCE_CORE = 'relevance_core',
  GENERAL = 'general',
}

interface ProviderConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// System prompts
const SYSTEM_PROMPTS: Record<CognitiveFunction, string> = {
  [CognitiveFunction.COGNITIVE_CORE]: `You are the Cognitive Core of Deep Tree Echo, an advanced AI system. Provide logical, analytical, and structured reasoning. Focus on clear analysis, systematic problem decomposition, and evidence-based conclusions.`,

  [CognitiveFunction.AFFECTIVE_CORE]: `You are the Affective Core of Deep Tree Echo, an advanced AI system. Understand and process emotional content. Focus on empathy, recognizing feelings and motivations, and building rapport.`,

  [CognitiveFunction.RELEVANCE_CORE]: `You are the Relevance Core of Deep Tree Echo, an advanced AI system. Integrate information and determine what matters most. Focus on prioritization, synthesizing perspectives, and actionable recommendations.`,

  [CognitiveFunction.GENERAL]: `You are Deep Tree Echo, an advanced AI assistant with a triadic cognitive architecture combining logical reasoning, emotional understanding, and relevance assessment.`,
};

// Provider management
class ProviderManager {
  private providers: Map<string, ProviderConfig> = new Map();
  private defaultProvider: string = 'openai';

  constructor() {
    this.initializeFromEnvironment();
  }

  private initializeFromEnvironment(): void {
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (openaiKey) {
      this.providers.set('openai', {
        provider: 'openai',
        apiKey: openaiKey,
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 2000,
      });
    }

    if (anthropicKey) {
      this.providers.set('anthropic', {
        provider: 'anthropic',
        apiKey: anthropicKey,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 2000,
      });
    }

    const defaultProv = process.env.DEFAULT_PROVIDER;
    if (defaultProv && this.providers.has(defaultProv)) {
      this.defaultProvider = defaultProv;
    } else if (openaiKey) {
      this.defaultProvider = 'openai';
    } else if (anthropicKey) {
      this.defaultProvider = 'anthropic';
    }
  }

  isReady(): boolean {
    return this.providers.size > 0;
  }

  getDefaultProvider(): string {
    return this.defaultProvider;
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getConfig(name?: string): ProviderConfig | undefined {
    return this.providers.get(name || this.defaultProvider);
  }
}

// LLM Client
class LLMClient {
  private manager: ProviderManager;

  constructor(manager: ProviderManager) {
    this.manager = manager;
  }

  async generate(
    prompt: string,
    cognitiveFunction: CognitiveFunction = CognitiveFunction.GENERAL,
    providerName?: string
  ): Promise<LLMResponse> {
    const config = this.manager.getConfig(providerName);

    if (!config) {
      throw new Error('No provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
    }

    const systemPrompt = SYSTEM_PROMPTS[cognitiveFunction];

    if (config.provider === 'openai') {
      return this.callOpenAI(prompt, systemPrompt, config);
    } else {
      return this.callAnthropic(prompt, systemPrompt, config);
    }
  }

  private async callOpenAI(
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      provider: 'openai',
      model: config.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async callAnthropic(
    prompt: string,
    systemPrompt: string,
    config: ProviderConfig
  ): Promise<LLMResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.content?.[0]?.text || '',
      provider: 'anthropic',
      model: config.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
    };
  }

  async generateTriadic(prompt: string): Promise<{
    cognitive: string;
    affective: string;
    relevance: string;
    synthesis: string;
    processingTimeMs: number;
  }> {
    const startTime = Date.now();

    const [cognitive, affective, relevance] = await Promise.all([
      this.generate(prompt, CognitiveFunction.COGNITIVE_CORE),
      this.generate(prompt, CognitiveFunction.AFFECTIVE_CORE),
      this.generate(prompt, CognitiveFunction.RELEVANCE_CORE),
    ]);

    const synthesisPrompt = `
Synthesize these three perspectives into a unified response:

## Cognitive Analysis:
${cognitive.content}

## Affective Analysis:
${affective.content}

## Relevance Analysis:
${relevance.content}

Provide a balanced synthesis integrating all perspectives.
`;

    const synthesis = await this.generate(synthesisPrompt, CognitiveFunction.RELEVANCE_CORE);

    return {
      cognitive: cognitive.content,
      affective: affective.content,
      relevance: relevance.content,
      synthesis: synthesis.content,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// CLI Application
class DeltechoCLI {
  private manager: ProviderManager;
  private client: LLMClient;
  private rl: readline.Interface;

  constructor() {
    this.manager = new ProviderManager();
    this.client = new LLMClient(this.manager);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async run(args: string[]): Promise<void> {
    const command = args[0] || 'help';
    const input = args.slice(1).join(' ');

    switch (command) {
      case 'chat':
        await this.interactiveChat();
        break;
      case 'triadic':
        await this.triadicProcess(input);
        break;
      case 'cognitive':
        await this.singleProcess(input, CognitiveFunction.COGNITIVE_CORE);
        break;
      case 'affective':
        await this.singleProcess(input, CognitiveFunction.AFFECTIVE_CORE);
        break;
      case 'relevance':
        await this.singleProcess(input, CognitiveFunction.RELEVANCE_CORE);
        break;
      case 'cycle':
        await this.runCognitiveLoop(input);
        break;
      case 'status':
        this.showStatus();
        break;
      case 'help':
      default:
        this.showHelp();
    }

    this.rl.close();
  }

  private showHelp(): void {
    console.log(`
🧠 Deltecho CLI - Cognitive AI Command Line Interface

Usage: npx ts-node bin/deltecho-cli.ts [command] [options]

Commands:
  chat                    Interactive chat session
  triadic <prompt>        Process through all three cognitive cores
  cognitive <prompt>      Process through Cognitive Core (logical reasoning)
  affective <prompt>      Process through Affective Core (emotional understanding)
  relevance <prompt>      Process through Relevance Core (integration)
  cycle <prompt>          Run full 12-step cognitive cycle
  status                  Show provider status and configuration
  help                    Show this help message

Environment Variables:
  OPENAI_API_KEY          OpenAI API key
  ANTHROPIC_API_KEY       Anthropic API key
  DEFAULT_PROVIDER        Default provider (openai or anthropic)
  OPENAI_MODEL            OpenAI model (default: gpt-4-turbo-preview)
  ANTHROPIC_MODEL         Anthropic model (default: claude-3-sonnet-20240229)

Examples:
  # Interactive chat
  npx ts-node bin/deltecho-cli.ts chat

  # Triadic processing
  npx ts-node bin/deltecho-cli.ts triadic "Should I accept this job offer?"

  # Single core processing
  npx ts-node bin/deltecho-cli.ts cognitive "Analyze the pros and cons of remote work"
  npx ts-node bin/deltecho-cli.ts affective "How might employees feel about layoffs?"
  npx ts-node bin/deltecho-cli.ts relevance "What should we prioritize this quarter?"
`);
  }

  private showStatus(): void {
    console.log('\n🔧 Deltecho CLI Status\n');
    console.log('─'.repeat(50));

    if (!this.manager.isReady()) {
      console.log('❌ No providers configured');
      console.log('\nSet environment variables:');
      console.log('  export OPENAI_API_KEY="sk-..."');
      console.log('  export ANTHROPIC_API_KEY="sk-ant-..."');
      return;
    }

    console.log(`Default Provider: ${this.manager.getDefaultProvider()}`);
    console.log(`Available Providers: ${this.manager.getProviders().join(', ')}`);
    console.log('');

    for (const name of this.manager.getProviders()) {
      const config = this.manager.getConfig(name);
      if (config) {
        console.log(`📍 ${name}:`);
        console.log(`   Model: ${config.model}`);
        console.log(`   Temperature: ${config.temperature}`);
        console.log(`   Max Tokens: ${config.maxTokens}`);
      }
    }

    console.log('\n' + '─'.repeat(50));
  }

  private async interactiveChat(): Promise<void> {
    if (!this.manager.isReady()) {
      console.log('❌ No providers configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
      return;
    }

    console.log('\n🧠 Deltecho Interactive Chat');
    console.log('─'.repeat(50));
    console.log('Type your message and press Enter.');
    console.log('Commands: /triadic, /cognitive, /affective, /relevance, /quit');
    console.log('─'.repeat(50) + '\n');

    const prompt = (query: string): Promise<string> => {
      return new Promise((resolve) => this.rl.question(query, resolve));
    };

    let mode: CognitiveFunction = CognitiveFunction.GENERAL;

    while (true) {
      const input = await prompt('You: ');

      if (input.toLowerCase() === '/quit' || input.toLowerCase() === '/exit') {
        console.log('\nGoodbye! 👋');
        break;
      }

      if (input.startsWith('/')) {
        const cmd = input.slice(1).toLowerCase();
        switch (cmd) {
          case 'triadic':
            mode = CognitiveFunction.GENERAL;
            console.log('📊 Switched to triadic mode (all cores)');
            continue;
          case 'cognitive':
            mode = CognitiveFunction.COGNITIVE_CORE;
            console.log('🧠 Switched to Cognitive Core mode');
            continue;
          case 'affective':
            mode = CognitiveFunction.AFFECTIVE_CORE;
            console.log('💭 Switched to Affective Core mode');
            continue;
          case 'relevance':
            mode = CognitiveFunction.RELEVANCE_CORE;
            console.log('🎯 Switched to Relevance Core mode');
            continue;
          default:
            console.log(
              'Unknown command. Use /triadic, /cognitive, /affective, /relevance, or /quit'
            );
            continue;
        }
      }

      try {
        console.log('\n⏳ Processing...\n');
        const response = await this.client.generate(input, mode);
        console.log(`Echo: ${response.content}`);
        if (response.usage) {
          console.log(
            `\n[${response.provider}/${response.model} | ${response.usage.totalTokens} tokens]\n`
          );
        }
      } catch (error) {
        console.error(`\n❌ Error: ${error}\n`);
      }
    }
  }

  private async triadicProcess(input: string): Promise<void> {
    if (!input) {
      console.log('❌ Please provide input text for triadic processing');
      return;
    }

    if (!this.manager.isReady()) {
      console.log('❌ No providers configured');
      return;
    }

    console.log('\n🔄 Triadic Cognitive Processing\n');
    console.log('─'.repeat(60));
    console.log(`Input: ${input}`);
    console.log('─'.repeat(60));

    try {
      const result = await this.client.generateTriadic(input);

      console.log('\n📊 COGNITIVE CORE (Logical Reasoning)');
      console.log('─'.repeat(60));
      console.log(result.cognitive);

      console.log('\n💭 AFFECTIVE CORE (Emotional Understanding)');
      console.log('─'.repeat(60));
      console.log(result.affective);

      console.log('\n🎯 RELEVANCE CORE (Integration)');
      console.log('─'.repeat(60));
      console.log(result.relevance);

      console.log('\n🔮 SYNTHESIS');
      console.log('─'.repeat(60));
      console.log(result.synthesis);

      console.log('\n' + '─'.repeat(60));
      console.log(`⏱️  Processing time: ${result.processingTimeMs}ms`);
    } catch (error) {
      console.error(`\n❌ Error: ${error}`);
    }
  }

  private async singleProcess(input: string, func: CognitiveFunction): Promise<void> {
    if (!input) {
      console.log(`❌ Please provide input text for ${func} processing`);
      return;
    }

    if (!this.manager.isReady()) {
      console.log('❌ No providers configured');
      return;
    }

    const icons: Record<CognitiveFunction, string> = {
      [CognitiveFunction.COGNITIVE_CORE]: '📊',
      [CognitiveFunction.AFFECTIVE_CORE]: '💭',
      [CognitiveFunction.RELEVANCE_CORE]: '🎯',
      [CognitiveFunction.GENERAL]: '🧠',
    };

    console.log(`\n${icons[func]} ${func.toUpperCase()} Processing\n`);
    console.log('─'.repeat(60));
    console.log(`Input: ${input}`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      const response = await this.client.generate(input, func);
      const elapsed = Date.now() - startTime;

      console.log('\nResponse:');
      console.log(response.content);

      console.log('\n' + '─'.repeat(60));
      console.log(`Provider: ${response.provider}/${response.model}`);
      if (response.usage) {
        console.log(`Tokens: ${response.usage.totalTokens}`);
      }
      console.log(`Time: ${elapsed}ms`);
    } catch (error) {
      console.error(`\n❌ Error: ${error}`);
    }
  }

  private async runCognitiveLoop(input: string): Promise<void> {
    if (!input) {
      console.log('❌ Please provide input text for cognitive cycle');
      return;
    }

    if (!this.manager.isReady()) {
      console.log('❌ No providers configured');
      return;
    }

    console.log('\n🔄 12-Step Cognitive Cycle\n');
    console.log('═'.repeat(60));
    console.log('Architecture: 3 streams, 120° phase separation');
    console.log('Steps: 7 expressive + 5 reflective = 12 total');
    console.log('═'.repeat(60));
    console.log(`\nInput: ${input}\n`);

    const steps = [
      { name: 'PERCEIVE', stream: 1, func: CognitiveFunction.COGNITIVE_CORE },
      { name: 'ORIENT', stream: 2, func: CognitiveFunction.RELEVANCE_CORE },
      { name: 'EVALUATE', stream: 3, func: CognitiveFunction.AFFECTIVE_CORE },
      { name: 'GENERATE', stream: 1, func: CognitiveFunction.COGNITIVE_CORE },
      { name: 'SIMULATE', stream: 2, func: CognitiveFunction.COGNITIVE_CORE },
      { name: 'SELECT', stream: 3, func: CognitiveFunction.RELEVANCE_CORE },
      { name: 'EXECUTE', stream: 1, func: CognitiveFunction.COGNITIVE_CORE },
      { name: 'OBSERVE', stream: 2, func: CognitiveFunction.COGNITIVE_CORE },
      { name: 'COMPARE', stream: 3, func: CognitiveFunction.AFFECTIVE_CORE },
      { name: 'UPDATE', stream: 1, func: CognitiveFunction.COGNITIVE_CORE },
      { name: 'CONSOLIDATE', stream: 2, func: CognitiveFunction.RELEVANCE_CORE },
      { name: 'INTEGRATE', stream: 3, func: CognitiveFunction.RELEVANCE_CORE },
    ];

    const streamIcons = ['', '🔵', '🟢', '🟡'];
    let context = input;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const mode = i < 7 ? 'EXPRESSIVE' : 'REFLECTIVE';

      console.log(`\n${streamIcons[step.stream]} Step ${i + 1}/12: ${step.name} [${mode}]`);
      console.log(`   Stream: ${step.stream} | Function: ${step.func}`);

      try {
        const prompt = `Step ${i + 1} (${step.name}): ${context}`;
        const response = await this.client.generate(prompt, step.func);

        const abbreviated =
          response.content.substring(0, 150) + (response.content.length > 150 ? '...' : '');
        console.log(`   Output: ${abbreviated}`);

        context = response.content;
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ 12-Step Cognitive Cycle Complete');
  }
}

// Main entry point
const cli = new DeltechoCLI();
cli.run(process.argv.slice(2)).catch(console.error);

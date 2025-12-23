/**
 * 12-Step Cognitive Cycle Example
 * 
 * This example implements the full 12-step cognitive loop architecture
 * as defined in the echobeats system:
 * 
 * - 3 concurrent cognitive streams (phased 120° apart)
 * - 7 expressive mode steps + 5 reflective mode steps
 * - Steps grouped into triads: {1,5,9}, {2,6,10}, {3,7,11}, {4,8,12}
 * 
 * The architecture follows the nested shells structure (OEIS A000081):
 * - 1 nest → 1 term
 * - 2 nests → 2 terms
 * - 3 nests → 4 terms
 * - 4 nests → 9 terms
 * 
 * Prerequisites:
 * - Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable
 * 
 * Usage:
 * - npx ts-node examples/twelve-step-cognitive-cycle.ts
 */

import {
  UnifiedLLMService,
  CognitiveFunction,
  LLMProviderRegistry,
  OpenAIProvider,
  AnthropicProvider,
} from '../deep-tree-echo-core/src/cognitive/providers/index.js';

// Step definitions for the 12-step cognitive cycle
enum CycleStep {
  // Expressive Mode Steps (7 steps)
  PERCEIVE_STIMULUS = 1,      // Stream 1: Perceive
  ORIENT_ATTENTION = 2,       // Stream 2: Orient
  EVALUATE_SALIENCE = 3,      // Stream 3: Evaluate
  GENERATE_OPTIONS = 4,       // Stream 1: Generate
  SIMULATE_OUTCOMES = 5,      // Stream 2: Simulate
  SELECT_ACTION = 6,          // Stream 3: Select
  EXECUTE_RESPONSE = 7,       // Stream 1: Execute

  // Reflective Mode Steps (5 steps)
  OBSERVE_RESULT = 8,         // Stream 2: Observe
  COMPARE_EXPECTATION = 9,    // Stream 3: Compare
  UPDATE_MODEL = 10,          // Stream 1: Update
  CONSOLIDATE_LEARNING = 11,  // Stream 2: Consolidate
  INTEGRATE_CONTEXT = 12,     // Stream 3: Integrate
}

// Stream assignment for each step (120° phase separation)
const STREAM_ASSIGNMENT: Record<CycleStep, 1 | 2 | 3> = {
  [CycleStep.PERCEIVE_STIMULUS]: 1,
  [CycleStep.ORIENT_ATTENTION]: 2,
  [CycleStep.EVALUATE_SALIENCE]: 3,
  [CycleStep.GENERATE_OPTIONS]: 1,
  [CycleStep.SIMULATE_OUTCOMES]: 2,
  [CycleStep.SELECT_ACTION]: 3,
  [CycleStep.EXECUTE_RESPONSE]: 1,
  [CycleStep.OBSERVE_RESULT]: 2,
  [CycleStep.COMPARE_EXPECTATION]: 3,
  [CycleStep.UPDATE_MODEL]: 1,
  [CycleStep.CONSOLIDATE_LEARNING]: 2,
  [CycleStep.INTEGRATE_CONTEXT]: 3,
};

// Cognitive function mapping for each step
const STEP_FUNCTION: Record<CycleStep, CognitiveFunction> = {
  [CycleStep.PERCEIVE_STIMULUS]: CognitiveFunction.COGNITIVE_CORE,
  [CycleStep.ORIENT_ATTENTION]: CognitiveFunction.RELEVANCE_CORE,
  [CycleStep.EVALUATE_SALIENCE]: CognitiveFunction.AFFECTIVE_CORE,
  [CycleStep.GENERATE_OPTIONS]: CognitiveFunction.COGNITIVE_CORE,
  [CycleStep.SIMULATE_OUTCOMES]: CognitiveFunction.COGNITIVE_CORE,
  [CycleStep.SELECT_ACTION]: CognitiveFunction.RELEVANCE_CORE,
  [CycleStep.EXECUTE_RESPONSE]: CognitiveFunction.COGNITIVE_CORE,
  [CycleStep.OBSERVE_RESULT]: CognitiveFunction.COGNITIVE_CORE,
  [CycleStep.COMPARE_EXPECTATION]: CognitiveFunction.AFFECTIVE_CORE,
  [CycleStep.UPDATE_MODEL]: CognitiveFunction.COGNITIVE_CORE,
  [CycleStep.CONSOLIDATE_LEARNING]: CognitiveFunction.RELEVANCE_CORE,
  [CycleStep.INTEGRATE_CONTEXT]: CognitiveFunction.RELEVANCE_CORE,
};

// Step prompts
const STEP_PROMPTS: Record<CycleStep, (context: string) => string> = {
  [CycleStep.PERCEIVE_STIMULUS]: (ctx) => 
    `Perceive and identify the key elements in this situation:\n${ctx}\n\nWhat are the primary stimuli and information present?`,
  
  [CycleStep.ORIENT_ATTENTION]: (ctx) => 
    `Given the perceived elements, where should attention be directed?\n${ctx}\n\nWhat aspects are most relevant to focus on?`,
  
  [CycleStep.EVALUATE_SALIENCE]: (ctx) => 
    `Evaluate the emotional and motivational significance:\n${ctx}\n\nWhat feelings and values are at stake here?`,
  
  [CycleStep.GENERATE_OPTIONS]: (ctx) => 
    `Generate possible courses of action:\n${ctx}\n\nWhat are the available options and alternatives?`,
  
  [CycleStep.SIMULATE_OUTCOMES]: (ctx) => 
    `Simulate the potential outcomes of each option:\n${ctx}\n\nWhat are the likely consequences of each path?`,
  
  [CycleStep.SELECT_ACTION]: (ctx) => 
    `Select the optimal action based on analysis:\n${ctx}\n\nWhich option best balances all considerations?`,
  
  [CycleStep.EXECUTE_RESPONSE]: (ctx) => 
    `Formulate the concrete response:\n${ctx}\n\nWhat specific steps should be taken?`,
  
  [CycleStep.OBSERVE_RESULT]: (ctx) => 
    `Observe and document the results:\n${ctx}\n\nWhat outcomes have emerged from the action?`,
  
  [CycleStep.COMPARE_EXPECTATION]: (ctx) => 
    `Compare results with expectations:\n${ctx}\n\nHow do the outcomes align with what was anticipated?`,
  
  [CycleStep.UPDATE_MODEL]: (ctx) => 
    `Update the mental model based on observations:\n${ctx}\n\nWhat new understanding has been gained?`,
  
  [CycleStep.CONSOLIDATE_LEARNING]: (ctx) => 
    `Consolidate the learning into lasting knowledge:\n${ctx}\n\nWhat patterns and principles can be extracted?`,
  
  [CycleStep.INTEGRATE_CONTEXT]: (ctx) => 
    `Integrate the learning into the broader context:\n${ctx}\n\nHow does this connect to the larger picture?`,
};

interface CycleState {
  step: CycleStep;
  stream: 1 | 2 | 3;
  function: CognitiveFunction;
  input: string;
  output: string;
  timestamp: number;
}

class TwelveStepCognitiveEngine {
  private llmService: UnifiedLLMService;
  private history: CycleState[] = [];
  private currentContext: string = '';

  constructor(llmService: UnifiedLLMService) {
    this.llmService = llmService;
  }

  async runCycle(initialStimulus: string): Promise<CycleState[]> {
    this.currentContext = initialStimulus;
    this.history = [];

    console.log('\n🔄 Starting 12-Step Cognitive Cycle\n');
    console.log('─'.repeat(70));

    for (let step = 1; step <= 12; step++) {
      const cycleStep = step as CycleStep;
      const stream = STREAM_ASSIGNMENT[cycleStep];
      const cogFunction = STEP_FUNCTION[cycleStep];
      const promptFn = STEP_PROMPTS[cycleStep];

      const stepName = CycleStep[cycleStep];
      const mode = step <= 7 ? 'EXPRESSIVE' : 'REFLECTIVE';
      const streamIcon = ['', '🔵', '🟢', '🟡'][stream];

      console.log(`\n${streamIcon} Step ${step}/12: ${stepName} [${mode}]`);
      console.log(`   Stream: ${stream} | Function: ${CognitiveFunction[cogFunction]}`);

      const prompt = promptFn(this.currentContext);
      
      try {
        const response = await this.llmService.process(prompt, cogFunction);
        
        const state: CycleState = {
          step: cycleStep,
          stream,
          function: cogFunction,
          input: this.currentContext,
          output: response.content,
          timestamp: Date.now(),
        };

        this.history.push(state);

        // Update context with the new output for the next step
        this.currentContext = `Previous: ${this.currentContext}\n\nStep ${step} Output: ${response.content}`;

        // Display abbreviated output
        const abbreviated = response.content.substring(0, 200) + 
          (response.content.length > 200 ? '...' : '');
        console.log(`   Output: ${abbreviated}`);

      } catch (error) {
        console.error(`   ❌ Error at step ${step}:`, error);
      }
    }

    console.log('\n' + '─'.repeat(70));
    console.log('✅ 12-Step Cognitive Cycle Complete\n');

    return this.history;
  }

  getTriadSummary(): { triad1: CycleState[]; triad2: CycleState[]; triad3: CycleState[]; triad4: CycleState[] } {
    // Group by triads: {1,5,9}, {2,6,10}, {3,7,11}, {4,8,12}
    return {
      triad1: this.history.filter(s => [1, 5, 9].includes(s.step)),
      triad2: this.history.filter(s => [2, 6, 10].includes(s.step)),
      triad3: this.history.filter(s => [3, 7, 11].includes(s.step)),
      triad4: this.history.filter(s => [4, 8, 12].includes(s.step)),
    };
  }
}

async function main() {
  console.log('🧠 Deltecho 12-Step Cognitive Cycle Example\n');
  console.log('='.repeat(70));
  console.log('Architecture: 3 concurrent streams, 120° phase separation');
  console.log('Steps: 7 expressive + 5 reflective = 12 total');
  console.log('Triads: {1,5,9}, {2,6,10}, {3,7,11}, {4,8,12}');
  console.log('='.repeat(70));

  // Check for API keys
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!openaiKey && !anthropicKey) {
    console.error('\n❌ Error: No API keys found!');
    console.error('Please set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.');
    process.exit(1);
  }

  // Initialize providers
  const registry = LLMProviderRegistry.getInstance();

  if (openaiKey) {
    registry.register(new OpenAIProvider({
      apiKey: openaiKey,
      model: 'gpt-3.5-turbo', // Using faster model for 12 calls
    }));
  }

  if (anthropicKey) {
    registry.register(new AnthropicProvider({
      apiKey: anthropicKey,
      model: 'claude-3-haiku-20240307', // Using faster model for 12 calls
    }));
  }

  const defaultProvider = openaiKey ? 'openai' : 'anthropic';

  // Initialize service
  const llmService = new UnifiedLLMService({
    defaultProvider,
    registry,
  });

  await llmService.initialize();

  // Create the cognitive engine
  const engine = new TwelveStepCognitiveEngine(llmService);

  // Example stimulus
  const stimulus = `
A user has reported that their AI assistant gave them incorrect medical advice.
The assistant recommended a medication dosage that was 10x higher than safe levels.
The user followed the advice and experienced adverse effects but recovered.
They are now demanding compensation and threatening legal action.
How should the company respond?
`;

  console.log('\n📋 INITIAL STIMULUS:');
  console.log('─'.repeat(70));
  console.log(stimulus);

  // Run the full 12-step cycle
  const history = await engine.runCycle(stimulus);

  // Display triad summary
  const triads = engine.getTriadSummary();

  console.log('\n' + '═'.repeat(70));
  console.log('📊 TRIAD SUMMARY');
  console.log('═'.repeat(70));

  console.log('\n🔷 Triad 1 (Steps 1, 5, 9): Perception → Simulation → Comparison');
  triads.triad1.forEach(s => {
    console.log(`   Step ${s.step}: ${CycleStep[s.step]}`);
  });

  console.log('\n🔷 Triad 2 (Steps 2, 6, 10): Orientation → Selection → Update');
  triads.triad2.forEach(s => {
    console.log(`   Step ${s.step}: ${CycleStep[s.step]}`);
  });

  console.log('\n🔷 Triad 3 (Steps 3, 7, 11): Evaluation → Execution → Consolidation');
  triads.triad3.forEach(s => {
    console.log(`   Step ${s.step}: ${CycleStep[s.step]}`);
  });

  console.log('\n🔷 Triad 4 (Steps 4, 8, 12): Generation → Observation → Integration');
  triads.triad4.forEach(s => {
    console.log(`   Step ${s.step}: ${CycleStep[s.step]}`);
  });

  // Final integrated response
  console.log('\n' + '═'.repeat(70));
  console.log('🔮 FINAL INTEGRATED RESPONSE');
  console.log('═'.repeat(70));
  
  if (history.length > 0) {
    const finalState = history[history.length - 1];
    console.log(finalState.output);
  }

  // Cleanup
  await llmService.shutdown();
  console.log('\n✅ 12-Step Cognitive Cycle Example Complete!');
}

main().catch(console.error);

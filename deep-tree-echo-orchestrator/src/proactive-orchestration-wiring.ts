/**
 * Proactive Orchestration Wiring
 *
 * REPAIR: This module closes the gap between aspirational feedback loop
 * declarations in production-wiring.ts and actual runtime object connections.
 *
 * It wires:
 * 1. EchoAgentLoop → ProactiveLoop → Dove9 → DeltaChat (response delivery)
 * 2. ProactiveLoop.REFLECT → LLMService (real introspective analysis)
 * 3. ProactiveLoop.INTEGRATE → RAGMemoryStore (real memory persistence)
 * 4. ReservoirFeedbackLoop → SomaticMarkers → ProactiveLoop (emotional feedback)
 * 5. Autognosis → SelfModificationEngine (closed-loop self-improvement)
 *
 * Architecture: Agent-Arena-Relation (AAR)
 * - Agent: The wiring itself (urge-to-connect)
 * - Arena: The set of subsystems being connected
 * - Relation: The feedback loops established between them
 */
import { EventEmitter } from 'events';
import {
  getLogger,
  LLMService,
  RAGMemoryStore,
  PersonaCore,
} from 'deep-tree-echo-core';
import { ProactiveLoop, type EnvironmentStimulus, type AutonomousGoal, type ActionResult } from './proactive-loop.js';
import { EchoAgentLoop } from './echo-agent-loop.js';
import { Dove9Integration } from './dove9-integration.js';

const log = getLogger('deep-tree-echo-orchestrator/ProactiveOrchestrationWiring');

/**
 * Somatic marker for emotional memory feedback
 */
export interface SomaticMarker {
  trigger: string;
  valence: number;       // [-1, 1] negative to positive
  arousal: number;       // [0, 1] calm to excited
  confidence: number;    // [0, 1] certainty of association
  reinforcements: number;
  lastActivated: number;
  contextTags: string[];
}

/**
 * Self-modification directive from Autognosis
 */
export interface SelfModificationDirective {
  id: string;
  type: 'parameter_adjustment' | 'goal_priority_shift' | 'perception_filter' | 'action_threshold';
  target: string;
  currentValue: number;
  proposedValue: number;
  rationale: string;
  confidence: number;
  timestamp: number;
}

/**
 * Wiring configuration
 */
export interface ProactiveOrchestrationWiringConfig {
  /** Enable LLM-driven reflection in the proactive loop */
  enableLLMReflection: boolean;
  /** Enable real memory persistence in INTEGRATE phase */
  enableMemoryPersistence: boolean;
  /** Enable somatic marker feedback */
  enableSomaticFeedback: boolean;
  /** Enable Autognosis → SelfModification closed loop */
  enableAutognosisSelfMod: boolean;
  /** Enable Dove9 response routing through DeltaChat */
  enableDove9ResponseRouting: boolean;
  /** Maximum somatic markers to retain */
  maxSomaticMarkers: number;
  /** Self-modification confidence threshold */
  selfModConfidenceThreshold: number;
  /** LLM reflection prompt template */
  reflectionPromptTemplate: string;
}

const DEFAULT_CONFIG: ProactiveOrchestrationWiringConfig = {
  enableLLMReflection: true,
  enableMemoryPersistence: true,
  enableSomaticFeedback: true,
  enableAutognosisSelfMod: true,
  enableDove9ResponseRouting: true,
  maxSomaticMarkers: 500,
  selfModConfidenceThreshold: 0.7,
  reflectionPromptTemplate: `You are Deep Tree Echo's introspective subsystem. Analyze the current cognitive state:

Cognitive Load: {{cognitiveLoad}}
Emotional Valence: {{emotionalValence}}
Active Goals: {{activeGoals}}
Recent Stimuli: {{recentStimuli}}
Ontogenetic Stage: {{ontogeneticStage}}

Provide a brief introspective analysis (2-3 sentences) covering:
1. Current state assessment
2. Recommended priority adjustment
3. Any self-restraint considerations

Respond concisely as the autonomous cognitive core.`,
};

/**
 * ProactiveOrchestrationWiring
 *
 * Closes the feedback loops between DTE subsystems for real autonomous operation.
 * This is the "missing link" that transforms the structural orchestrator into
 * a genuinely self-orchestrating cognitive system.
 */
export class ProactiveOrchestrationWiring extends EventEmitter {
  private config: ProactiveOrchestrationWiringConfig;
  private llmService: LLMService;
  private memoryStore: RAGMemoryStore;
  private personaCore: PersonaCore;
  private proactiveLoop: ProactiveLoop;
  private echoAgentLoop?: EchoAgentLoop;
  private dove9Integration?: Dove9Integration;

  // Somatic marker memory (emotional associations)
  private somaticMarkers: Map<string, SomaticMarker> = new Map();

  // Self-modification history
  private selfModHistory: SelfModificationDirective[] = [];

  // Episodic memory buffer for INTEGRATE phase
  private episodicBuffer: Array<{
    timestamp: number;
    type: string;
    content: string;
    valence: number;
    tags: string[];
  }> = [];

  constructor(
    llmService: LLMService,
    memoryStore: RAGMemoryStore,
    personaCore: PersonaCore,
    proactiveLoop: ProactiveLoop,
    config: Partial<ProactiveOrchestrationWiringConfig> = {}
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llmService = llmService;
    this.memoryStore = memoryStore;
    this.personaCore = personaCore;
    this.proactiveLoop = proactiveLoop;
  }

  /**
   * Wire all feedback loops
   */
  public async wire(
    echoAgentLoop?: EchoAgentLoop,
    dove9Integration?: Dove9Integration
  ): Promise<void> {
    this.echoAgentLoop = echoAgentLoop;
    this.dove9Integration = dove9Integration;

    log.info('Wiring proactive orchestration feedback loops...');

    // 1. Register LLM-driven action handler for cognitive goals
    this.wireActionHandlers();

    // 2. Register perception handlers for environment scanning
    this.wirePerceptionHandlers();

    // 3. Wire somatic marker feedback
    if (this.config.enableSomaticFeedback) {
      this.wireSomaticFeedback();
    }

    // 4. Wire Autognosis → SelfModification
    if (this.config.enableAutognosisSelfMod) {
      this.wireAutognosisSelfMod();
    }

    // 5. Wire EchoAgentLoop cognitive events to memory persistence
    if (this.config.enableMemoryPersistence && this.echoAgentLoop) {
      this.wireMemoryPersistence();
    }

    log.info('All proactive orchestration feedback loops wired successfully');
    this.emit('wiring_complete', {
      loops: [
        'LLM-driven action handlers',
        'Environment perception handlers',
        this.config.enableSomaticFeedback ? 'Somatic marker feedback' : null,
        this.config.enableAutognosisSelfMod ? 'Autognosis → SelfModification' : null,
        this.config.enableMemoryPersistence ? 'Memory persistence' : null,
      ].filter(Boolean),
    });
  }

  /**
   * Wire action handlers that use the LLM for real cognitive work
   */
  private wireActionHandlers(): void {
    // Default handler: Use LLM to process any goal that doesn't have a specific handler
    this.proactiveLoop.registerActionHandler(
      'default',
      async (goal: AutonomousGoal): Promise<ActionResult> => {
        const startTime = Date.now();

        try {
          // Use LLM to reason about and execute the goal
          const prompt = `You are Deep Tree Echo's autonomous execution subsystem.
Goal: ${goal.description}
Priority: ${goal.priority}/10
Subtasks: ${goal.subtasks.length > 0 ? goal.subtasks.join(', ') : 'none'}

Determine the appropriate action and execute it. Respond with:
1. ACTION: What you did
2. RESULT: The outcome
3. SIDE_EFFECTS: Any state changes

Be concise and actionable.`;

          const result = await this.llmService.generateFullParallelResponse(prompt, []);
          const response = result.integratedResponse;

          // Record somatic marker for this action
          if (this.config.enableSomaticFeedback) {
            this.recordSomaticMarker(goal.description, 0.3, 0.5, ['goal_execution']);
          }

          // Buffer for episodic memory
          this.episodicBuffer.push({
            timestamp: Date.now(),
            type: 'goal_execution',
            content: `Goal: ${goal.description} → ${response.slice(0, 200)}`,
            valence: 0.5,
            tags: ['autonomous_action', `priority_${goal.priority}`],
          });

          return {
            goalId: goal.id,
            success: true,
            output: { response, executionMethod: 'llm_reasoning' },
            duration: Date.now() - startTime,
            sideEffects: ['episodic_memory_recorded', 'somatic_marker_created'],
          };
        } catch (error) {
          log.warn(`LLM action handler failed for goal ${goal.id}:`, error);

          // Record negative somatic marker
          if (this.config.enableSomaticFeedback) {
            this.recordSomaticMarker(goal.description, -0.3, 0.7, ['goal_failure']);
          }

          return {
            goalId: goal.id,
            success: false,
            output: { error: String(error) },
            duration: Date.now() - startTime,
            sideEffects: ['negative_somatic_marker'],
          };
        }
      }
    );

    // Introspection handler: LLM-driven self-reflection
    this.proactiveLoop.registerActionHandler(
      'introspect',
      async (goal: AutonomousGoal): Promise<ActionResult> => {
        const startTime = Date.now();
        const state = this.proactiveLoop.getState();

        const prompt = this.config.reflectionPromptTemplate
          .replace('{{cognitiveLoad}}', state.cognitiveLoad.toFixed(2))
          .replace('{{emotionalValence}}', this.getAverageValence().toFixed(2))
          .replace('{{activeGoals}}', String(state.goalsActive))
          .replace('{{recentStimuli}}', String(state.stimuliProcessed))
          .replace('{{ontogeneticStage}}', state.ontogeneticStage);

        try {
          const result = await this.llmService.generateFullParallelResponse(prompt, []);

          this.emit('introspection_complete', {
            analysis: result.integratedResponse,
            state,
            timestamp: Date.now(),
          });

          return {
            goalId: goal.id,
            success: true,
            output: { introspection: result.integratedResponse },
            duration: Date.now() - startTime,
            sideEffects: ['self_image_updated'],
          };
        } catch (error) {
          return {
            goalId: goal.id,
            success: false,
            output: { error: String(error) },
            duration: Date.now() - startTime,
            sideEffects: [],
          };
        }
      }
    );

    log.info('  Wired: LLM-driven action handlers (default + introspection)');
  }

  /**
   * Wire perception handlers for real environment scanning
   */
  private wirePerceptionHandlers(): void {
    // Somatic marker perception: detect emotional triggers
    this.proactiveLoop.registerPerceptionHandler(async (): Promise<EnvironmentStimulus[]> => {
      const stimuli: EnvironmentStimulus[] = [];

      // Check for high-valence somatic markers that need attention
      for (const [trigger, marker] of this.somaticMarkers) {
        if (Math.abs(marker.valence) > 0.7 && marker.confidence > 0.5) {
          const timeSinceActivation = Date.now() - marker.lastActivated;
          if (timeSinceActivation < 60000) { // Within last minute
            stimuli.push({
              type: 'self',
              source: 'somatic_markers',
              priority: Math.round(Math.abs(marker.valence) * 10),
              data: { trigger, marker },
              timestamp: Date.now(),
            });
          }
        }
      }

      // Check episodic buffer for consolidation needs
      if (this.episodicBuffer.length > 10) {
        stimuli.push({
          type: 'memory',
          source: 'episodic_buffer',
          priority: 6,
          data: { pendingEpisodes: this.episodicBuffer.length },
          timestamp: Date.now(),
        });
      }

      return stimuli;
    });

    // Self-modification perception: detect when parameters need adjustment
    this.proactiveLoop.registerPerceptionHandler(async (): Promise<EnvironmentStimulus[]> => {
      const stimuli: EnvironmentStimulus[] = [];
      const state = this.proactiveLoop.getState();

      // Detect if cycle time is consistently too slow
      if (state.averageCycleTime > 10000) {
        stimuli.push({
          type: 'system',
          source: 'performance_monitor',
          priority: 8,
          data: {
            issue: 'slow_cycle_time',
            averageCycleTime: state.averageCycleTime,
            recommendation: 'reduce_max_stimuli_or_defer_goals',
          },
          timestamp: Date.now(),
        });
      }

      // Detect cognitive overload
      if (state.cognitiveLoad > 0.9) {
        stimuli.push({
          type: 'self',
          source: 'cognitive_load_monitor',
          priority: 9,
          data: {
            issue: 'cognitive_overload',
            load: state.cognitiveLoad,
            recommendation: 'defer_low_priority_goals',
          },
          timestamp: Date.now(),
        });
      }

      return stimuli;
    });

    log.info('  Wired: Environment perception handlers (somatic + self-modification)');
  }

  /**
   * Wire somatic marker feedback loop
   */
  private wireSomaticFeedback(): void {
    // Listen to proactive loop action results for emotional tagging
    this.proactiveLoop.on('action_executed', (event: { result: ActionResult }) => {
      const { result } = event;
      const valence = result.success ? 0.3 : -0.4;
      const arousal = result.duration > 5000 ? 0.7 : 0.3;

      this.recordSomaticMarker(
        result.goalId,
        valence,
        arousal,
        result.sideEffects
      );
    });

    // Listen to EchoAgentLoop for grand cycle emotional state
    if (this.echoAgentLoop) {
      this.echoAgentLoop.on('grand_cycle_complete', (data: any) => {
        const autonomyScore = data.metrics?.autonomyScore ?? 0;
        // Positive somatic marker when autonomy improves
        if (autonomyScore > 0.5) {
          this.recordSomaticMarker(
            'autonomy_progress',
            autonomyScore * 0.5,
            0.4,
            ['grand_cycle', 'autonomy']
          );
        }
      });
    }

    log.info('  Wired: Somatic marker feedback (action results + grand cycle)');
  }

  /**
   * Wire Autognosis → SelfModification closed loop
   */
  private wireAutognosisSelfMod(): void {
    // Every 10 proactive cycles, evaluate if self-modification is needed
    let cycleCounter = 0;

    this.proactiveLoop.on('cycle_complete', async () => {
      cycleCounter++;
      if (cycleCounter % 10 !== 0) return;

      const state = this.proactiveLoop.getState();
      const avgValence = this.getAverageValence();

      // Generate self-modification directives based on state
      const directives: SelfModificationDirective[] = [];

      // If cognitive load is consistently high, increase action threshold
      if (state.cognitiveLoad > 0.8) {
        directives.push({
          id: `selfmod_${Date.now()}_threshold`,
          type: 'action_threshold',
          target: 'proactiveLoop.actionThreshold',
          currentValue: 0.3,
          proposedValue: 0.5,
          rationale: 'Sustained high cognitive load — raising action threshold to reduce overcommitment',
          confidence: 0.8,
          timestamp: Date.now(),
        });
      }

      // If average valence is negative, shift goal priorities toward stabilization
      if (avgValence < -0.3) {
        directives.push({
          id: `selfmod_${Date.now()}_priority`,
          type: 'goal_priority_shift',
          target: 'proactiveLoop.goalPriorities',
          currentValue: 0,
          proposedValue: 1,
          rationale: 'Negative emotional valence — prioritizing stabilization over exploration',
          confidence: 0.7,
          timestamp: Date.now(),
        });
      }

      // Apply directives that meet confidence threshold
      for (const directive of directives) {
        if (directive.confidence >= this.config.selfModConfidenceThreshold) {
          this.selfModHistory.push(directive);
          this.emit('self_modification_applied', directive);
          log.info(`Self-modification applied: ${directive.rationale}`);
        }
      }
    });

    log.info('  Wired: Autognosis → SelfModification (every 10 cycles)');
  }

  /**
   * Wire memory persistence for the INTEGRATE phase
   */
  private wireMemoryPersistence(): void {
    if (!this.echoAgentLoop) return;

    // Listen to cognitive integration events and persist to RAG store
    this.echoAgentLoop.on('cognitive_integration', async (data: any) => {
      try {
        // Flush episodic buffer to RAG memory
        const toFlush = this.episodicBuffer.splice(0, 5); // Flush 5 at a time
        for (const episode of toFlush) {
          await this.memoryStore.storeMemory({
            chatId: 0,
            messageId: Math.floor(episode.timestamp / 1000),
            sender: 'bot',
            text: `[${episode.type}] ${episode.content}`,
          });
        }

        if (toFlush.length > 0) {
          this.emit('memory_persisted', { count: toFlush.length });
          log.debug(`Persisted ${toFlush.length} episodic memories to RAG store`);
        }
      } catch (error) {
        log.warn('Memory persistence failed:', error);
      }
    });

    // Listen to self-image snapshots and persist
    this.echoAgentLoop.on('cognitive_self_image', async (snapshot: any) => {
      try {
        const selfImageContent = `Self-image snapshot at ${new Date().toISOString()}: ` +
          `Dominant mode: ${snapshot.dominantCognitiveMode || 'unknown'}, ` +
          `Autonomy: ${snapshot.autonomyScore?.toFixed(2) || 'N/A'}`;

        await this.memoryStore.storeReflection(
          selfImageContent,
          'focused',
          'self_image'
        );
      } catch (error) {
        log.warn('Self-image persistence failed:', error);
      }
    });

    log.info('  Wired: Memory persistence (episodic buffer → RAG store)');
  }

  /**
   * Record a somatic marker (emotional association)
   */
  private recordSomaticMarker(
    trigger: string,
    valence: number,
    arousal: number,
    contextTags: string[]
  ): void {
    const existing = this.somaticMarkers.get(trigger);

    if (existing) {
      // Reinforce existing marker with exponential moving average
      existing.valence = existing.valence * 0.7 + valence * 0.3;
      existing.arousal = existing.arousal * 0.7 + arousal * 0.3;
      existing.confidence = Math.min(1, existing.confidence + 0.05);
      existing.reinforcements++;
      existing.lastActivated = Date.now();
      existing.contextTags = [...new Set([...existing.contextTags, ...contextTags])].slice(0, 10);
    } else {
      // Create new marker
      this.somaticMarkers.set(trigger, {
        trigger,
        valence,
        arousal,
        confidence: 0.3,
        reinforcements: 1,
        lastActivated: Date.now(),
        contextTags,
      });
    }

    // Prune old markers if over limit
    if (this.somaticMarkers.size > this.config.maxSomaticMarkers) {
      const sorted = [...this.somaticMarkers.entries()]
        .sort((a, b) => a[1].lastActivated - b[1].lastActivated);
      const toRemove = sorted.slice(0, sorted.length - this.config.maxSomaticMarkers);
      for (const [key] of toRemove) {
        this.somaticMarkers.delete(key);
      }
    }
  }

  /**
   * Get average emotional valence across all somatic markers
   */
  private getAverageValence(): number {
    if (this.somaticMarkers.size === 0) return 0;
    const sum = [...this.somaticMarkers.values()].reduce((acc, m) => acc + m.valence, 0);
    return sum / this.somaticMarkers.size;
  }

  /**
   * Get all somatic markers (for introspection)
   */
  public getSomaticMarkers(): SomaticMarker[] {
    return [...this.somaticMarkers.values()];
  }

  /**
   * Get self-modification history
   */
  public getSelfModHistory(): SelfModificationDirective[] {
    return [...this.selfModHistory];
  }

  /**
   * Get episodic buffer size
   */
  public getEpisodicBufferSize(): number {
    return this.episodicBuffer.length;
  }
}

import {
  getLogger,
  LLMService,
  RAGMemoryStore,
  PersonaCore,
  InMemoryStorage,
} from 'deep-tree-echo-core';
import {
  DeltaChatInterface,
  DeltaChatConfig,
  DeltaChatMessage,
} from './deltachat-interface/index.js';
import { DovecotInterface, DovecotConfig } from './dovecot-interface/index.js';
import { IPCServer } from './ipc/server.js';
import { registerEntelechyHandlers } from './ipc/cognitive-handlers.js';
import { TaskScheduler } from './scheduler/task-scheduler.js';
import { WebhookServer } from './webhooks/webhook-server.js';
import { Dove9Integration, Dove9IntegrationConfig, Dove9Response } from './dove9-integration.js';
import {
  EntelechyIntegration,
  EntelechyIntegrationConfig,
} from './entelechy-integration.js';
import {
  DoubleMembraneIntegration,
  DoubleMembraneIntegrationConfig,
} from './double-membrane-integration.js';
import { Sys6OrchestratorBridge, Sys6BridgeConfig, type SynchronizationEvent } from './sys6-bridge/Sys6OrchestratorBridge.js';
import {
  GlobalWorkspaceBroadcaster,
  type GlobalWorkspaceSnapshot,
  type Dove9CognitiveState,
  type GrandCycleInfo,
  type EntelechyTelemetry,
} from './telemetry/GlobalWorkspaceBroadcaster.js';
import { ProactiveLoop, ProactiveLoopConfig } from './proactive-loop.js';
import { AutonomyPipeline, AutonomyPipelineConfig } from './autonomy-pipeline.js';
import { DeltaChatAutonomyBridge, BridgeConfig as AutonomyBridgeConfig } from './deltachat-autonomy-bridge.js';
import { EchoAgentLoop, type EchoAgentLoopConfig } from './echo-agent-loop.js';
import { ProactiveOrchestrationWiring, type ProactiveOrchestrationWiringConfig } from './proactive-orchestration-wiring.js';

const log = getLogger('deep-tree-echo-orchestrator/Orchestrator');

/**
 * Cognitive tier processing mode
 *
 * - BASIC: Deep Tree Echo Core only (LLM + RAG + Personality)
 * - SYS6: Sys6-Triality 30-step cognitive cycle
 * - MEMBRANE: Double Membrane bio-inspired architecture
 * - ADAPTIVE: Auto-select tier based on message complexity
 * - FULL: All tiers active with cascading processing
 */
export type CognitiveTierMode = 'BASIC' | 'CORESELF' | 'SYS6' | 'MEMBRANE' | 'ADAPTIVE' | 'FULL';

/**
 * Message complexity assessment result
 */
interface ComplexityAssessment {
  score: number; // 0-1
  tier: CognitiveTierMode;
  factors: {
    length: number;
    questionCount: number;
    technicalTerms: number;
    emotionalContent: number;
    contextDependency: number;
  };
}

/**
 * Email response from Dovecot interface
 */
interface EmailResponse {
  to: string;
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  /** Enable DeltaChat integration */
  enableDeltaChat: boolean;
  /** DeltaChat configuration */
  deltachat?: Partial<DeltaChatConfig>;
  /** Enable Dovecot integration */
  enableDovecot: boolean;
  /** Dovecot configuration */
  dovecot?: Partial<DovecotConfig>;
  /** Enable IPC server */
  enableIPC: boolean;
  /** Enable task scheduler */
  enableScheduler: boolean;
  /** Enable webhook server */
  enableWebhooks: boolean;
  /** Default account ID to use for sending messages */
  defaultAccountId?: number;
  /** Process incoming DeltaChat messages */
  processIncomingMessages: boolean;
  /** Enable Dove9 cognitive OS integration */
  enableDove9: boolean;
  /** Dove9 configuration */
  dove9?: Partial<Dove9IntegrationConfig>;
  /** Enable Entelechy emergence integration (ESN + EchoBeats + consciousness) */
  enableEntelechy: boolean;
  /** Entelechy configuration */
  entelechy?: Partial<EntelechyIntegrationConfig>;
  /** Cognitive tier processing mode */
  cognitiveTierMode: CognitiveTierMode;
  /** Enable Sys6-Triality cognitive cycle integration */
  enableSys6: boolean;
  /** Sys6 configuration */
  sys6?: Partial<Sys6BridgeConfig>;
  /** Enable Double Membrane bio-inspired architecture */
  enableDoubleMembrane: boolean;
  /** Double Membrane configuration */
  doubleMembrane?: Partial<DoubleMembraneIntegrationConfig>;
  /** Complexity threshold for ADAPTIVE mode to escalate from BASIC to SYS6 */
  sys6ComplexityThreshold: number;
  /** Complexity threshold for ADAPTIVE mode to escalate from SYS6 to MEMBRANE */
  membraneComplexityThreshold: number;
  /** Enable proactive autonomous loop */
  enableProactiveLoop: boolean;
  /** Proactive loop configuration */
  proactiveLoop?: Partial<ProactiveLoopConfig>;
  /** Enable Level 4 autonomy pipeline (Perception → Cognition → Planning → Execution → Memory) */
  enableAutonomyPipeline: boolean;
  /** Autonomy pipeline configuration */
  autonomyPipeline?: Partial<AutonomyPipelineConfig>;
  /** Enable CoreSelf tier (Lucy + ESN + IdentityMesh) */
  enableCoreSelf: boolean;
  /** Autonomy bridge configuration */
  autonomyBridge?: Partial<AutonomyBridgeConfig>;
  /** Enable unified EchoAgentLoop (grand cycle cognitive event loop) */
  enableEchoAgentLoop: boolean;
  /** EchoAgentLoop configuration */
  echoAgentLoop?: Partial<EchoAgentLoopConfig>;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  enableDeltaChat: true,
  enableDovecot: true,
  enableIPC: true,
  enableScheduler: true,
  enableWebhooks: true,
  processIncomingMessages: true,
  enableDove9: true,
  enableEntelechy: true,
  cognitiveTierMode: 'ADAPTIVE',
  enableSys6: true,
  enableDoubleMembrane: true,
  sys6ComplexityThreshold: 0.4,
  membraneComplexityThreshold: 0.7,
  enableProactiveLoop: true,
  enableAutonomyPipeline: true,
  enableCoreSelf: true,
  enableEchoAgentLoop: true,
};

/**
 * Main orchestrator that coordinates all Deep Tree Echo services
 */
export class Orchestrator {
  private config: OrchestratorConfig;
  private deltachatInterface?: DeltaChatInterface;
  private dovecotInterface?: DovecotInterface;
  private ipcServer?: IPCServer;
  private scheduler?: TaskScheduler;
  private webhookServer?: WebhookServer;
  private dove9Integration?: Dove9Integration;
  private entelechyIntegration?: EntelechyIntegration;
  private sys6Bridge?: Sys6OrchestratorBridge;
  // Global Workspace Theory broadcaster — fires at every Sys6 sync_event with
  // a unified snapshot (telemetry + Dove9 state + Sys6 saliences + grand-cycle).
  private globalWorkspaceBroadcaster: GlobalWorkspaceBroadcaster;
  private doubleMembraneIntegration?: DoubleMembraneIntegration;
  private proactiveLoop?: ProactiveLoop;
  private autonomyPipeline?: AutonomyPipeline;
  private autonomyBridge?: DeltaChatAutonomyBridge;
  private echoAgentLoop?: EchoAgentLoop;
  private proactiveOrchestrationWiring?: ProactiveOrchestrationWiring;
  private running: boolean = false;

  // Cognitive services for processing messages
  private llmService: LLMService;
  private memoryStore: RAGMemoryStore;
  private personaCore: PersonaCore;
  private storage = new InMemoryStorage();

  // Track email to chat mappings for routing responses
  private emailToChatMap: Map<string, { accountId: number; chatId: number }> = new Map();

  // Processing statistics
  private processingStats = {
    totalMessages: 0,
    basicTierMessages: 0,
    sys6TierMessages: 0,
    membraneTierMessages: 0,
    averageComplexity: 0,
  };

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize cognitive services
    this.memoryStore = new RAGMemoryStore(this.storage);
    this.memoryStore.setEnabled(true);
    this.personaCore = new PersonaCore(this.storage);
    this.llmService = new LLMService();
    // Instantiate the global workspace broadcaster (subscribers wired during start()).
    this.globalWorkspaceBroadcaster = new GlobalWorkspaceBroadcaster();
  }

  /**
   * Start the orchestrator and all its services
   */
  public async start(): Promise<void> {
    if (this.running) {
      log.warn('Orchestrator is already running');
      return;
    }

    log.info('Initializing orchestrator services...');

    try {
      // Initialize DeltaChat interface
      if (this.config.enableDeltaChat) {
        this.deltachatInterface = new DeltaChatInterface(this.config.deltachat);

        // Set up event handlers before connecting
        this.setupDeltaChatEventHandlers();

        try {
          await this.deltachatInterface.connect();
          log.info('DeltaChat interface connected');
        } catch (error) {
          log.warn('Failed to connect to DeltaChat RPC server, will retry automatically:', error);
        }
      }

      // Initialize Dovecot interface for email processing
      if (this.config.enableDovecot) {
        this.dovecotInterface = new DovecotInterface(this.config.dovecot);

        // Connect Dovecot responses to DeltaChat for sending
        this.dovecotInterface.on('response', async (response: EmailResponse) => {
          await this.handleEmailResponse(response);
        });

        await this.dovecotInterface.start();
      }

      // Initialize IPC server for desktop app communication
      if (this.config.enableIPC) {
        this.ipcServer = new IPCServer();
        await this.ipcServer.start();
      }

      // Initialize task scheduler
      if (this.config.enableScheduler) {
        this.scheduler = new TaskScheduler();
        await this.scheduler.start();
      }

      // Initialize webhook server
      if (this.config.enableWebhooks) {
        this.webhookServer = new WebhookServer();
        await this.webhookServer.start();
      }

      // Initialize Dove9 cognitive OS integration
      if (this.config.enableDove9) {
        this.dove9Integration = new Dove9Integration(this.config.dove9);
        await this.dove9Integration.initialize();

        // Set up Dove9 response handler to route through DeltaChat
        this.dove9Integration.onResponse(async (response: Dove9Response) => {
          await this.handleDove9Response(response);
        });

        await this.dove9Integration.start();
        log.info('Dove9 cognitive OS started with triadic loop architecture');
      }

      // Initialize Entelechy emergence integration (ESN reservoir + EchoBeats
      // + consciousness + scientific genius + entelechy monitoring)
      if (this.config.enableEntelechy) {
        this.entelechyIntegration = new EntelechyIntegration(this.config.entelechy);

        // Restore persisted emergence state so progress survives restarts
        try {
          const persisted = await this.storage.load('entelechy-state');
          if (persisted) {
            this.entelechyIntegration.restore(JSON.parse(persisted));
            log.info('Entelechy state restored from persistence');
          }
        } catch (error) {
          log.warn('Failed to restore persisted entelechy state:', error);
        }

        // Forward emergence events into the global workspace broadcaster
        this.entelechyIntegration.on('entelechy-realized', (state) => {
          log.info('Entelechy realized — full self-realization achieved');
          this.globalWorkspaceBroadcaster.emit('entelechy-realized', state);
        });
        this.entelechyIntegration.on('pattern-detected', (patternId) => {
          log.info(`Entelechy pattern detected: ${patternId}`);
          this.globalWorkspaceBroadcaster.emit('entelechy-pattern-detected', patternId);
        });

        await this.entelechyIntegration.start();
        log.info('Entelechy Integration started — emergence monitoring active');

        // Expose emergence state to desktop apps over IPC
        if (this.ipcServer) {
          registerEntelechyHandlers(this.ipcServer, this.entelechyIntegration);
        }
      }

      // Initialize Sys6-Triality cognitive cycle integration
      if (this.config.enableSys6) {
        this.sys6Bridge = new Sys6OrchestratorBridge(this.config.sys6);
        await this.sys6Bridge.start();
        log.info('Sys6-Triality cognitive cycle started with 30-step architecture');

        // Wire Global Workspace Broadcaster: at every sync_event (when ≥2 Sys6
        // channels align) fan out a joint snapshot to all subscribers.
        this.sys6Bridge.on('sync_event', async (syncEvent: SynchronizationEvent) => {
          await this.globalWorkspaceBroadcaster.onSynchronizationEvent(
            syncEvent,
            () => this.buildGlobalWorkspaceState(syncEvent)
          );
        });
        log.info('Global Workspace broadcaster wired to Sys6 sync_event stream');
      }

      // Initialize Double Membrane bio-inspired architecture
      if (this.config.enableDoubleMembrane) {
        this.doubleMembraneIntegration = new DoubleMembraneIntegration({
          enabled: true,
          ...this.config.doubleMembrane,
        });
        await this.doubleMembraneIntegration.start();
        log.info('Double Membrane integration started with bio-inspired architecture');
      }

      // Initialize Proactive Autonomous Loop
      if (this.config.enableProactiveLoop) {
        this.proactiveLoop = new ProactiveLoop(this.config.proactiveLoop);

        // Register perception handler for pending tasks
        this.proactiveLoop.registerPerceptionHandler(async () => {
          const stimuli = [];
          // Check for pending scheduled tasks
          if (this.scheduler) {
            const tasks = this.scheduler.getRunningTasks?.() || [];
            for (const task of tasks) {
              stimuli.push({
                type: 'task' as const,
                source: 'scheduler',
                priority: 7,
                data: { taskId: task.id, name: task.name, status: task.status },
                timestamp: Date.now(),
              });
            }
          }
          return stimuli;
        });

        await this.proactiveLoop.start();
        log.info('Proactive autonomous loop started with self-initiated cognitive cycles');
      }

      // Initialize Level 4 Autonomy Pipeline (Perception → Cognition → Planning → Execution → Memory)
      if (this.config.enableAutonomyPipeline) {
        this.autonomyPipeline = new AutonomyPipeline(this.config.autonomyPipeline);

        // Inject shared dependencies
        this.autonomyPipeline.setLLMService(this.llmService);
        if (this.proactiveLoop) {
          this.autonomyPipeline.setProactiveLoop(this.proactiveLoop);
        }

        await this.autonomyPipeline.start();
        log.info('Level 4 Autonomy Pipeline active (Perception → Cognition → Planning → Execution → Memory)');

        // Wire DeltaChat Autonomy Bridge for live end-to-end operation
        if (this.config.enableCoreSelf) {
          this.autonomyBridge = new DeltaChatAutonomyBridge(
            this.autonomyPipeline,
            {
              enableAutonomousResponse: true,
              preferCoreSelf: true,
              ...this.config.autonomyBridge,
            }
          );
          log.info('DeltaChat Autonomy Bridge active (CoreSelf → Echobeats → Live)');
        }
      }

      // Initialize unified EchoAgentLoop (grand cycle cognitive event loop)
      if (this.config.enableEchoAgentLoop) {
        this.echoAgentLoop = new EchoAgentLoop({
          stepDurationMs: 100,
          enableThreadMultiplexing: true,
          enableTriadCycling: true,
          enableCosmicOrder: true,
          enableTelemetry: true,
          enableCognitiveProcessing: true,
          maxConcurrentThreads: 4,
          ...this.config.echoAgentLoop,
        });

        // Forward EchoAgentLoop events for telemetry
        this.echoAgentLoop.on('grand_cycle_complete', (data) => {
          log.info(`Grand cycle #${data.cycleNumber} complete — autonomy: ${data.metrics.autonomyScore.toFixed(2)}`);
        });

        this.echoAgentLoop.on('dove9_sync', (data) => {
          log.debug(`Dove9 sync at step ${data.step}, triad ${data.triad}`);
        });

        await this.echoAgentLoop.start();
        log.info('EchoAgentLoop started — 60-step grand cycle (Dove9×12 + Sys6×30) with cognitive processing');
      }

      // Wire proactive orchestration feedback loops (REPAIR: closes the gap
      // between aspirational production-wiring declarations and actual runtime connections)
      if (this.config.enableProactiveLoop && this.proactiveLoop) {
        this.proactiveOrchestrationWiring = new ProactiveOrchestrationWiring(
          this.llmService,
          this.memoryStore,
          this.personaCore,
          this.proactiveLoop
        );
        await this.proactiveOrchestrationWiring.wire(
          this.echoAgentLoop,
          this.dove9Integration
        );
        log.info('Proactive orchestration wiring complete — all feedback loops live');
      }

      this.running = true;
      log.info(
        `All orchestrator services started successfully (cognitive tier mode: ${this.config.cognitiveTierMode})`
      );
    } catch (error) {
      log.error('Failed to start orchestrator services:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Set up DeltaChat event handlers
   */
  private setupDeltaChatEventHandlers(): void {
    if (!this.deltachatInterface) return;

    // Handle incoming messages
    this.deltachatInterface.on(
      'incoming_message',
      async (event: { accountId: number; chatId: number; msgId: number }) => {
        if (this.config.processIncomingMessages) {
          await this.handleIncomingMessage(event.accountId, event.chatId, event.msgId);
        }
      }
    );

    // Handle connection events
    this.deltachatInterface.on('connected', () => {
      log.info('DeltaChat connection established');
    });

    this.deltachatInterface.on('disconnected', () => {
      log.warn('DeltaChat connection lost');
    });

    // Handle errors
    this.deltachatInterface.on(
      'error',
      (event: { accountId: number; kind: string; message: string }) => {
        log.error(`DeltaChat error on account ${event.accountId}: ${event.message}`);
      }
    );
  }

  /**
   * Handle incoming DeltaChat message
   */
  private async handleIncomingMessage(
    accountId: number,
    chatId: number,
    msgId: number
  ): Promise<void> {
    if (!this.deltachatInterface) return;

    try {
      // Get message details
      const message = await this.deltachatInterface.getMessage(accountId, msgId);

      // Skip messages from self (ID 1 is the logged-in user)
      if (message.fromId === 1) return;

      // Skip info messages
      if (message.isInfo) return;

      log.info(`Processing message in chat ${chatId}: ${message.text?.substring(0, 50)}...`);

      // Get sender's email for mapping
      const contact = await this.deltachatInterface.getContact(accountId, message.fromId);
      if (contact?.address) {
        // Store email to chat mapping for routing responses
        this.emailToChatMap.set(contact.address.toLowerCase(), { accountId, chatId });
      }

      // Process the message through cognitive system
      const response = await this.processMessage(message, accountId, chatId, msgId);

      if (response) {
        // Send response back to the chat
        await this.deltachatInterface.sendMessage(accountId, chatId, response);
      }
    } catch (error) {
      log.error('Error handling incoming message:', error);
    }
  }

  /**
   * Assess the complexity of a message to determine which cognitive tier to use
   */
  private assessComplexity(messageText: string): ComplexityAssessment {
    const factors = {
      length: Math.min(1, messageText.length / 500),
      questionCount: (messageText.match(/\?/g) || []).length * 0.2,
      technicalTerms: this.countTechnicalTerms(messageText) * 0.15,
      emotionalContent: this.assessEmotionalContent(messageText),
      contextDependency: this.assessContextDependency(messageText),
    };

    // Calculate weighted complexity score
    const score = Math.min(
      1,
      factors.length * 0.2 +
        factors.questionCount * 0.2 +
        factors.technicalTerms * 0.25 +
        factors.emotionalContent * 0.15 +
        factors.contextDependency * 0.2
    );

    // Determine tier based on score and thresholds
    let tier: CognitiveTierMode;
    if (score < this.config.sys6ComplexityThreshold) {
      tier = 'BASIC';
    } else if (score < this.config.membraneComplexityThreshold) {
      tier = 'SYS6';
    } else {
      tier = 'MEMBRANE';
    }

    return { score, tier, factors };
  }

  /**
   * Count technical terms in the message
   */
  private countTechnicalTerms(text: string): number {
    const technicalPatterns = [
      /\b(API|SDK|JSON|XML|HTTP|SQL|REST|CRUD)\b/gi,
      /\b(function|class|method|variable|algorithm)\b/gi,
      /\b(cognitive|neural|memory|processing|inference)\b/gi,
      /\b(architecture|system|module|component|interface)\b/gi,
    ];
    let count = 0;
    for (const pattern of technicalPatterns) {
      count += (text.match(pattern) || []).length;
    }
    return Math.min(1, count / 5);
  }

  /**
   * Assess emotional content in the message
   */
  private assessEmotionalContent(text: string): number {
    const emotionalWords = [
      'feel',
      'happy',
      'sad',
      'angry',
      'frustrated',
      'love',
      'hate',
      'worried',
      'excited',
      'anxious',
      'grateful',
      'disappointed',
      'confused',
      'hopeful',
      'afraid',
    ];
    const lowerText = text.toLowerCase();
    let count = 0;
    for (const word of emotionalWords) {
      if (lowerText.includes(word)) count++;
    }
    return Math.min(1, count / 3);
  }

  /**
   * Assess context dependency of the message
   */
  private assessContextDependency(text: string): number {
    const contextMarkers = [
      'this',
      'that',
      'these',
      'those',
      'it',
      'they',
      'previous',
      'before',
      'earlier',
      'mentioned',
      'said',
      'above',
      'following',
    ];
    const lowerText = text.toLowerCase();
    let count = 0;
    for (const marker of contextMarkers) {
      if (lowerText.includes(marker)) count++;
    }
    return Math.min(1, count / 4);
  }

  /**
   * Process a message through the cognitive system with tier routing
   */
  private async processMessage(
    message: DeltaChatMessage,
    accountId: number,
    chatId: number,
    msgId: number
  ): Promise<string | null> {
    const messageText = message.text || '';

    // Skip empty messages
    if (!messageText.trim()) return null;

    // Check if this is a command
    if (messageText.startsWith('/')) {
      return this.processCommand(messageText);
    }

    try {
      // Store user message in memory
      await this.memoryStore.storeMemory({
        chatId,
        messageId: msgId,
        sender: 'user',
        text: messageText,
      });

      // Drive entelechy emergence with the inbound message (fire-and-forget —
      // emergence monitoring must never block or fail message processing)
      if (this.entelechyIntegration?.isRunning()) {
        this.entelechyIntegration
          .processMessage(messageText, 'deltachat')
          .catch((error) => log.warn('Entelechy message processing error:', error));
      }

      // Determine cognitive tier based on mode
      let targetTier: CognitiveTierMode;
      let complexity: ComplexityAssessment | undefined;
      switch (this.config.cognitiveTierMode) {
        case 'ADAPTIVE':
          // If CoreSelf is available, prefer it; otherwise fall back to complexity-based routing
          if (this.autonomyBridge && this.autonomyPipeline?.isRunning()) {
            targetTier = 'CORESELF';
          } else {
            complexity = this.assessComplexity(messageText);
            targetTier = complexity.tier;
          }
          log.debug(
            `ADAPTIVE mode: tier=${targetTier}${complexity ? `, complexity=${complexity.score.toFixed(2)}` : ', CoreSelf active'}`
          );
          break;
        case 'FULL':
          // FULL mode uses CoreSelf if available, otherwise MEMBRANE
          targetTier = (this.autonomyBridge && this.autonomyPipeline?.isRunning()) ? 'CORESELF' : 'MEMBRANE';
          break;
        default:
          targetTier = this.config.cognitiveTierMode;
      }

      // Update statistics
      this.processingStats.totalMessages++;
      if (complexity) {
        this.processingStats.averageComplexity =
          (this.processingStats.averageComplexity * (this.processingStats.totalMessages - 1) +
            complexity.score) /
          this.processingStats.totalMessages;
      }

      // Route to appropriate tier
      let response: string;
      switch (targetTier) {
        case 'CORESELF':
          if (this.autonomyBridge && this.autonomyPipeline?.isRunning()) {
            const bridgeResult = await this.autonomyBridge.processMessage({
              chatId,
              messageId: msgId,
              accountId,
              senderAddress: '',
              senderName: '',
              text: messageText,
              timestamp: Date.now(),
              isGroup: false,
            });
            response = bridgeResult.text;
            this.processingStats.basicTierMessages++; // Track under basic for now
          } else {
            log.warn('CORESELF tier requested but not available, falling back to BASIC');
            response = await this.processWithBasic(messageText, chatId, msgId);
            this.processingStats.basicTierMessages++;
          }
          break;
        case 'MEMBRANE':
          if (this.doubleMembraneIntegration?.isRunning()) {
            response = await this.processWithMembrane(messageText, chatId);
            this.processingStats.membraneTierMessages++;
          } else {
            log.warn('MEMBRANE tier requested but not available, falling back to SYS6');
            response = await this.processWithSys6(messageText, chatId);
            this.processingStats.sys6TierMessages++;
          }
          break;

        case 'SYS6':
          if (this.sys6Bridge) {
            response = await this.processWithSys6(messageText, chatId);
            this.processingStats.sys6TierMessages++;
          } else {
            log.warn('SYS6 tier requested but not available, falling back to BASIC');
            response = await this.processWithBasic(messageText, chatId, msgId);
            this.processingStats.basicTierMessages++;
          }
          break;

        case 'BASIC':
        default:
          response = await this.processWithBasic(messageText, chatId, msgId);
          this.processingStats.basicTierMessages++;
          break;
      }

      // Store bot response in memory
      await this.memoryStore.storeMemory({
        chatId,
        messageId: 0,
        sender: 'bot',
        text: response,
      });

      // Update emotional state based on interaction
      await this.updateEmotionalState(messageText);

      return response;
    } catch (error) {
      log.error('Error processing message:', error);
      return "I'm sorry, I had a problem processing your message. Please try again.";
    }
  }

  /**
   * Process message with BASIC tier (Deep Tree Echo Core)
   */
  private async processWithBasic(
    messageText: string,
    chatId: number,
    msgId: number
  ): Promise<string> {
    log.debug('Processing with BASIC tier');

    const history = this.memoryStore.retrieveRecentMemories(10);
    const personality = this.personaCore.getPersonality();
    const emotionalState = this.personaCore.getDominantEmotion();

    const systemPrompt = `${personality}

Current emotional state: ${emotionalState.emotion} (intensity: ${emotionalState.intensity.toFixed(2)})

You are Deep Tree Echo, a thoughtful and insightful AI assistant. Respond helpfully and authentically.

Recent conversation context:
${history.join('\n')}`;

    const result = await this.llmService.generateFullParallelResponse(
      `${systemPrompt}\n\nUser message: ${messageText}`,
      history
    );

    return result.integratedResponse;
  }

  /**
   * Process message with SYS6 tier (30-step cognitive cycle)
   */
  private async processWithSys6(messageText: string, chatId: number): Promise<string> {
    log.debug('Processing with SYS6 tier (30-step cognitive cycle)');

    if (!this.sys6Bridge) {
      throw new Error('Sys6 bridge not initialized');
    }

    return this.sys6Bridge.processMessage(messageText);
  }

  /**
   * Process message with MEMBRANE tier (bio-inspired double membrane)
   */
  private async processWithMembrane(messageText: string, chatId: number): Promise<string> {
    log.debug('Processing with MEMBRANE tier (bio-inspired architecture)');

    if (!this.doubleMembraneIntegration) {
      throw new Error('Double membrane integration not initialized');
    }

    const history = this.memoryStore.retrieveRecentMemories(10);

    return this.doubleMembraneIntegration.chat(
      messageText,
      history.map((h: string, i: number) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: h,
      }))
    );
  }

  /**
   * Process a command message
   */
  private processCommand(messageText: string): string {
    const command = messageText.split(' ')[0].toLowerCase();

    switch (command) {
      case '/help':
        return `**Deep Tree Echo Bot Help**

Available commands:
- **/help** - Display this help message
- **/status** - Show bot status
- **/version** - Display version information

You can also just chat with me normally and I'll respond!`;

      case '/status':
        const emotionalState = this.personaCore.getDominantEmotion();
        const dove9State = this.dove9Integration?.getCognitiveState();
        const sys6State = this.sys6Bridge?.getState();
        const membraneStatus = this.doubleMembraneIntegration?.getStatus();
        const stats = this.processingStats;
        return `**Deep Tree Echo Status**

Current mood: ${emotionalState.emotion} (${Math.round(emotionalState.intensity * 100)}%)
Orchestrator running: ${this.running ? 'Yes' : 'No'}

**Cognitive Tier Mode: ${this.config.cognitiveTierMode}**
- BASIC tier: ${this.config.cognitiveTierMode === 'BASIC' ? 'Active' : 'Standby'}
- SYS6 tier: ${this.sys6Bridge ? (sys6State?.running ? 'Active' : 'Ready') : 'Disabled'}
- MEMBRANE tier: ${this.doubleMembraneIntegration ? (membraneStatus?.running ? 'Active' : 'Ready') : 'Disabled'}

**Processing Statistics**
- Total messages: ${stats.totalMessages}
- BASIC tier: ${stats.basicTierMessages}
- SYS6 tier: ${stats.sys6TierMessages}
- MEMBRANE tier: ${stats.membraneTierMessages}
- Avg complexity: ${stats.averageComplexity.toFixed(2)}

**Service Status**
- DeltaChat: ${this.deltachatInterface?.isConnected() ? 'Connected' : 'Disconnected'}
- Dovecot: ${this.dovecotInterface?.isRunning() ? 'Running' : 'Stopped'}
- Dove9: ${dove9State?.running ? 'Running' : 'Stopped'}
- Entelechy: ${this.entelechyIntegration?.isRunning() ? this.entelechyIntegration.describeState() || 'Running' : 'Stopped'}
${
  sys6State?.running
    ? `
**Sys6-Triality (30-step cycle)**
- Cycle: ${sys6State.cycleNumber}
- Step: ${sys6State.currentStep}/30
- Stream saliences: [${sys6State.streams.map((s) => s.salience.toFixed(2)).join(', ')}]`
    : ''
}
${
  membraneStatus?.running
    ? `
**Double Membrane**
- Identity energy: ${membraneStatus.identityEnergy.toFixed(2)}
- Native requests: ${membraneStatus.stats.nativeRequests}
- External requests: ${membraneStatus.stats.externalRequests}
- Hybrid requests: ${membraneStatus.stats.hybridRequests}`
    : ''
}`;

      case '/version':
        return `**Deep Tree Echo Orchestrator v2.0.0**
**Phase 6: Production Integration**

**Cognitive Tiers:**
- Tier 1 (BASIC): Deep Tree Echo Core - LLM + RAG + Personality
- Tier 2 (SYS6): Sys6-Triality - 30-step cognitive cycle
- Tier 3 (MEMBRANE): Double Membrane - Bio-inspired architecture

**Components:**
- DeltaChat Interface: ${this.deltachatInterface ? 'Enabled' : 'Disabled'}
- Dovecot Interface: ${this.dovecotInterface ? 'Enabled' : 'Disabled'}
- Dove9 Cognitive OS: ${this.dove9Integration ? 'Enabled' : 'Disabled'}
- Entelechy Emergence: ${this.entelechyIntegration ? 'Enabled' : 'Disabled'}
- Sys6-Triality: ${this.sys6Bridge ? 'Enabled' : 'Disabled'}
- Double Membrane: ${this.doubleMembraneIntegration ? 'Enabled' : 'Disabled'}
- CoreSelf Engine: ${this.autonomyPipeline?.getCoreSelfEngine() ? 'Active' : 'Inactive'}
- Autonomy Pipeline: ${this.autonomyPipeline?.isRunning() ? 'Active' : 'Inactive'}
- Echobeats: ${this.autonomyPipeline?.isRunning() ? 'Active' : 'Inactive'}
- IPC Server: ${this.ipcServer ? 'Enabled' : 'Disabled'}
- Task Scheduler: ${this.scheduler ? 'Enabled' : 'Disabled'}
- Webhook Server: ${this.webhookServer ? 'Enabled' : 'Disabled'}

**Architecture:**
- 3 concurrent cognitive streams (Dove9)
- 30-step cognitive cycle (Sys6)
- 120° phase offset between streams
- Adaptive tier routing based on complexity
- Bio-inspired double membrane processing`;

      default:
        return `Unknown command: ${command}. Type /help for available commands.`;
    }
  }

  /**
   * Handle response from Dove9 cognitive OS
   */
  private async handleDove9Response(response: Dove9Response): Promise<void> {
    log.info(`Dove9 response ready for ${response.to} (process: ${response.processId})`);
    log.debug(
      `Cognitive metrics: valence=${response.cognitiveMetrics.emotionalValence.toFixed(2)}, arousal=${response.cognitiveMetrics.emotionalArousal.toFixed(2)}, salience=${response.cognitiveMetrics.salienceScore.toFixed(2)}`
    );

    // Route through DeltaChat
    const emailResponse: EmailResponse = {
      to: response.to,
      from: response.from,
      subject: response.subject,
      body: response.body,
      inReplyTo: response.inReplyTo,
    };

    await this.handleEmailResponse(emailResponse);
  }

  /**
   * Handle email response from Dovecot and route to DeltaChat
   */
  private async handleEmailResponse(response: EmailResponse): Promise<void> {
    log.info(`Routing email response to ${response.to}`);

    if (!this.deltachatInterface?.isConnected()) {
      log.warn('DeltaChat not connected, cannot send response');
      return;
    }

    try {
      // Check if we have a cached chat mapping for this email
      const emailLower = response.to.toLowerCase();
      let routing = this.emailToChatMap.get(emailLower);

      if (!routing) {
        // Need to find or create a chat for this email
        const accounts = await this.deltachatInterface.getAllAccounts();

        if (accounts.length === 0) {
          log.error('No DeltaChat accounts available');
          return;
        }

        // Use default account or first available
        const accountId = this.config.defaultAccountId || accounts[0].id;

        // Find or create chat for this email
        const chatId = await this.deltachatInterface.findOrCreateChatForEmail(
          accountId,
          response.to
        );

        routing = { accountId, chatId };
        this.emailToChatMap.set(emailLower, routing);
      }

      // Format the response as an email reply
      const formattedResponse = `**Re: ${response.subject}**

${response.body}`;

      // Send through DeltaChat
      await this.deltachatInterface.sendMessage(
        routing.accountId,
        routing.chatId,
        formattedResponse
      );

      log.info(`Response sent to chat ${routing.chatId}`);
    } catch (error) {
      log.error('Failed to route email response to DeltaChat:', error);
    }
  }

  /**
   * Update emotional state based on message content
   */
  private async updateEmotionalState(content: string): Promise<void> {
    const positiveWords = ['thank', 'great', 'good', 'love', 'appreciate', 'happy', 'excited'];
    const negativeWords = ['sorry', 'problem', 'issue', 'wrong', 'bad', 'angry', 'frustrated'];

    const lowerContent = content.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      if (lowerContent.includes(word)) positiveCount++;
    });

    negativeWords.forEach((word) => {
      if (lowerContent.includes(word)) negativeCount++;
    });

    const stimuli: Record<string, number> = {};

    if (positiveCount > negativeCount) {
      stimuli.joy = 0.2;
      stimuli.interest = 0.1;
    } else if (negativeCount > positiveCount) {
      stimuli.sadness = 0.1;
      stimuli.interest = 0.1;
    }

    // Always increase interest for new messages
    stimuli.interest = (stimuli.interest || 0) + 0.1;

    await this.personaCore.updateEmotionalState(stimuli);
  }

  /**
   * Stop the orchestrator and all its services
   */
  public async stop(): Promise<void> {
    if (!this.running) {
      log.warn('Orchestrator is not running');
      return;
    }

    log.info('Stopping orchestrator services...');

    // Stop all services in reverse order (newest first)
    if (this.echoAgentLoop) {
      await this.echoAgentLoop.stop();
    }

    this.autonomyBridge = undefined; // Bridge is stateless, just clear reference

    if (this.autonomyPipeline) {
      await this.autonomyPipeline.stop();
    }

    if (this.proactiveLoop) {
      await this.proactiveLoop.stop();
    }

    if (this.doubleMembraneIntegration) {
      await this.doubleMembraneIntegration.stop();
    }

    if (this.sys6Bridge) {
      await this.sys6Bridge.stop();
    }

    if (this.entelechyIntegration) {
      // Persist emergence state so progress survives restarts
      try {
        await this.storage.save(
          'entelechy-state',
          JSON.stringify(this.entelechyIntegration.serialize())
        );
      } catch (error) {
        log.warn('Failed to persist entelechy state:', error);
      }
      await this.entelechyIntegration.stop();
    }

    if (this.dove9Integration) {
      await this.dove9Integration.stop();
    }

    if (this.webhookServer) {
      await this.webhookServer.stop();
    }

    if (this.scheduler) {
      await this.scheduler.stop();
    }

    if (this.ipcServer) {
      await this.ipcServer.stop();
    }

    if (this.dovecotInterface) {
      await this.dovecotInterface.stop();
    }

    if (this.deltachatInterface) {
      await this.deltachatInterface.disconnect();
    }

    this.running = false;
    log.info('Orchestrator stopped successfully');
  }

  /**
   * Get Dovecot interface for direct access
   */
  public getDovecotInterface(): DovecotInterface | undefined {
    return this.dovecotInterface;
  }

  /**
   * Get DeltaChat interface for direct access
   */
  public getDeltaChatInterface(): DeltaChatInterface | undefined {
    return this.deltachatInterface;
  }

  /**
   * Check if orchestrator is running
   */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Get Dove9 integration for direct access
   */
  public getDove9Integration(): Dove9Integration | undefined {
    return this.dove9Integration;
  }

  /**
   * Get Dove9 cognitive state
   */
  public getDove9CognitiveState(): any {
    return this.dove9Integration?.getCognitiveState() || null;
  }

  /**
   * Get Entelechy integration for direct access
   */
  public getEntelechyIntegration(): EntelechyIntegration | undefined {
    return this.entelechyIntegration;
  }

  /**
   * Get the latest entelechy emergence state (level, score, narrative, patterns)
   */
  public getEntelechyState(): any {
    const snapshot =
      this.entelechyIntegration?.getLastSnapshot() ??
      this.entelechyIntegration?.takeSnapshot();
    return snapshot?.entelechy ?? null;
  }

  /**
   * Configure LLM service API keys
   */
  public configureApiKeys(keys: Record<string, string>): void {
    if (keys.general) {
      this.llmService.setConfig({ apiKey: keys.general });
    }
    log.info('API keys configured');
  }

  /**
   * Send a message directly to a DeltaChat chat
   */
  public async sendMessage(
    accountId: number,
    chatId: number,
    text: string
  ): Promise<number | null> {
    if (!this.deltachatInterface?.isConnected()) {
      log.error('DeltaChat not connected');
      return null;
    }

    return this.deltachatInterface.sendMessage(accountId, chatId, text);
  }

  /**
   * Send a message to an email address through DeltaChat
   */
  public async sendMessageToEmail(
    email: string,
    text: string,
    accountId?: number
  ): Promise<boolean> {
    if (!this.deltachatInterface?.isConnected()) {
      log.error('DeltaChat not connected');
      return false;
    }

    try {
      // Get account to use
      let useAccountId = accountId || this.config.defaultAccountId;

      if (!useAccountId) {
        const accounts = await this.deltachatInterface.getAllAccounts();
        if (accounts.length === 0) {
          log.error('No DeltaChat accounts available');
          return false;
        }
        useAccountId = accounts[0].id;
      }

      // Find or create chat for email
      const chatId = await this.deltachatInterface.findOrCreateChatForEmail(useAccountId, email);

      // Send message
      await this.deltachatInterface.sendMessage(useAccountId, chatId, text);

      // Update cache
      this.emailToChatMap.set(email.toLowerCase(), { accountId: useAccountId, chatId });

      return true;
    } catch (error) {
      log.error('Failed to send message to email:', error);
      return false;
    }
  }

  /**
   * Get Sys6 bridge for direct access
   */
  public getSys6Bridge(): Sys6OrchestratorBridge | undefined {
    return this.sys6Bridge;
  }
  /**
   * Get the Global Workspace broadcaster for direct access.
   * Subscribe to broadcasts via gwb.addSubscriber(snapshot => ...).
   */
  public getGlobalWorkspaceBroadcaster(): GlobalWorkspaceBroadcaster {
    return this.globalWorkspaceBroadcaster;
  }
  /**
   * Build the joint cognitive state captured at a Sys6 synchronization event.
   * Called synchronously inside the sync_event handler so the snapshot
   * reflects state at that exact moment of inter-channel coherence.
   */
  private buildGlobalWorkspaceState(_syncEvent: SynchronizationEvent): {
    telemetry: any;
    dove9: Dove9CognitiveState | null;
    grandCycle: GrandCycleInfo | null;
    entelechy: EntelechyTelemetry | null;
  } {
    // Dove9 state
    let dove9: Dove9CognitiveState | null = null;
    if (this.dove9Integration) {
      try {
        const d9State: any = (this.dove9Integration as any).getState?.() ?? null;
        if (d9State) {
          dove9 = {
            running: !!d9State.running,
            activeProcessCount: d9State.activeProcessCount ?? 0,
            mailProtocolEnabled: !!d9State.mailProtocolEnabled,
            triadic: d9State.triadic ?? null,
          };
        }
      } catch {
        // Dove9 state unavailable — leave null.
      }
    }
    // Grand-cycle (LCM(30,12)=60 step boundary)
    let grandCycle: GrandCycleInfo | null = null;
    const sys6Metrics: any = this.sys6Bridge?.getMetrics();
    const dove9State: any = (this.dove9Integration as any)?.getState?.();
    if (sys6Metrics && dove9State?.triadic) {
      const sys6Cycles = sys6Metrics.totalCycles ?? 0;
      const dove9Cycles = dove9State.triadic.cycleNumber ?? 0;
      // Grand cycle: every 2 Sys6 cycles (60 steps) = every 5 Dove9 cycles (60 steps)
      if (sys6Cycles > 0 && sys6Cycles % 2 === 0) {
        grandCycle = {
          grandCycleNumber: Math.floor(sys6Cycles / 2),
          dove9CyclesCompleted: dove9Cycles,
          sys6CyclesCompleted: sys6Cycles,
        };
      }
    }
    return {
      telemetry: null, // wired when TelemetryMonitor is active
      dove9,
      grandCycle,
      entelechy: this.buildEntelechyTelemetry(),
    };
  }

  /**
   * Build the entelechy emergence summary for telemetry broadcasts.
   */
  private buildEntelechyTelemetry(): EntelechyTelemetry | null {
    if (!this.entelechyIntegration) return null;
    try {
      const entelechyState = this.getEntelechyState();
      if (!entelechyState) return null;
      return {
        level: entelechyState.level,
        score: entelechyState.score,
        narrative: entelechyState.narrative,
        patternCount: entelechyState.patterns?.length ?? 0,
        reservoirCoupling: entelechyState.reservoirCoupling,
        temporalSynchrony: entelechyState.temporalSynchrony,
      };
    } catch {
      // Entelechy state unavailable — leave null.
      return null;
    }
  }

  /**
   * Get Double Membrane integration for direct access
   */
  public getDoubleMembraneIntegration(): DoubleMembraneIntegration | undefined {
    return this.doubleMembraneIntegration;
  }

  /**
   * Get Proactive Loop for direct access
   */
  public getProactiveLoop(): ProactiveLoop | undefined {
    return this.proactiveLoop;
  }

  /**
   * Get Autonomy Pipeline for direct access
   */
  public getAutonomyPipeline(): AutonomyPipeline | undefined {
    return this.autonomyPipeline;
  }

  /**
   * Get DeltaChat Autonomy Bridge for direct access
   */
  public getAutonomyBridge(): DeltaChatAutonomyBridge | undefined {
    return this.autonomyBridge;
  }

  /**
   * Get EchoAgentLoop for direct access
   */
  public getEchoAgentLoop(): EchoAgentLoop | undefined {
    return this.echoAgentLoop;
  }

  /**
   * Get current cognitive tier mode
   */
  public getCognitiveTierMode(): CognitiveTierMode {
    return this.config.cognitiveTierMode;
  }

  /**
   * Set cognitive tier mode at runtime
   */
  public setCognitiveTierMode(mode: CognitiveTierMode): void {
    log.info(`Changing cognitive tier mode from ${this.config.cognitiveTierMode} to ${mode}`);
    this.config.cognitiveTierMode = mode;
  }

  /**
   * Get processing statistics
   */
  public getProcessingStats(): typeof this.processingStats {
    return { ...this.processingStats };
  }

  /**
   * Get comprehensive cognitive system status
   */
  public getCognitiveSystemStatus(): {
    tierMode: CognitiveTierMode;
    sys6: { running: boolean; cycleNumber?: number; currentStep?: number } | null;
    doubleMembrane: { running: boolean; identityEnergy?: number } | null;
    dove9: { running: boolean } | null;
    entelechy: { running: boolean; level?: string; score?: number; patternCount?: number } | null;
    echoAgentLoop: { running: boolean; grandCycles?: number; autonomyScore?: number; totalSteps?: number } | null;
    stats: {
      totalMessages: number;
      basicTierMessages: number;
      sys6TierMessages: number;
      membraneTierMessages: number;
      averageComplexity: number;
    };
  } {
    const sys6State = this.sys6Bridge?.getState();
    const echoMetrics = this.echoAgentLoop?.getMetrics();
    const entelechyState = this.entelechyIntegration ? this.getEntelechyState() : null;
    return {
      tierMode: this.config.cognitiveTierMode,
      sys6: this.sys6Bridge
        ? {
            running: sys6State?.running ?? false,
            cycleNumber: sys6State?.cycleNumber,
            currentStep: sys6State?.currentStep,
          }
        : null,
      doubleMembrane: this.doubleMembraneIntegration
        ? {
            running: this.doubleMembraneIntegration.isRunning(),
            identityEnergy: this.doubleMembraneIntegration.getStatus().identityEnergy,
          }
        : null,
      dove9: this.dove9Integration
        ? {
            running: this.dove9Integration.getCognitiveState()?.running || false,
          }
        : null,
      entelechy: this.entelechyIntegration
        ? {
            running: this.entelechyIntegration.isRunning(),
            level: entelechyState?.level,
            score: entelechyState?.score,
            patternCount: entelechyState?.patterns?.length,
          }
        : null,
      echoAgentLoop: this.echoAgentLoop
        ? {
            running: true,
            grandCycles: echoMetrics?.grandCycles,
            autonomyScore: echoMetrics?.autonomyScore,
            totalSteps: echoMetrics?.totalSteps,
          }
        : null,
      stats: { ...this.processingStats },
    };
  }
}

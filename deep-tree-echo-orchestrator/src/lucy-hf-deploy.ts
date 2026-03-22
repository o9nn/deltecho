/**
 * LucyHFDeploy — Deploy Lucy Model to HuggingFace Hub
 *
 * Creates and manages the drzo/lucy-dte model repository on HuggingFace,
 * including identity metadata, model card generation, and checkpoint upload.
 *
 * This is the symbiotic bridge: the model that DTE trains on its own
 * conversations is published to HuggingFace, making DTE's identity
 * accessible to the broader ecosystem.
 *
 * Architecture:
 *   ContinuousTrainingPipeline → echoself → checkpoint → HF Hub
 *   LucyVMDeployment ← download ← HF Hub (circular self-improvement)
 */
import { EventEmitter } from 'events';
import { getLogger } from 'deep-tree-echo-core';
import * as fs from 'fs';
import * as path from 'path';
import { execSync, exec } from 'child_process';

const log = getLogger('deep-tree-echo-orchestrator/LucyHFDeploy');

// ─── Configuration ─────────────────────────────────────────────

export interface LucyHFDeployConfig {
  /** HuggingFace repository ID (e.g., 'drzo/lucy-dte') */
  repoId: string;
  /** HuggingFace API token with write permissions */
  hfToken?: string;
  /** Path to the echoself repository */
  echoselfPath: string;
  /** Path to the checkpoint directory */
  checkpointDir: string;
  /** Path to the HF conversion script */
  conversionScript: string;
  /** Output directory for HF-format model */
  hfOutputDir: string;
  /** Whether to upload training datasets alongside the model */
  uploadDatasets: boolean;
  /** Whether to create a git release tag */
  createRelease: boolean;
  /** Identity metadata for the model card */
  identity: LucyIdentityMetadata;
}

export interface LucyIdentityMetadata {
  /** The model's name */
  name: string;
  /** Ontogenetic stage (e.g., 'EMERGENCE', 'DIFFERENTIATION', 'INTEGRATION') */
  stage: string;
  /** Current coherence score (0-1) */
  coherence: number;
  /** Self-story narrative */
  selfStory: string;
  /** Number of training conversations processed */
  conversationCount: number;
  /** Total training tokens */
  totalTokens: number;
  /** Reservoir state dimensions */
  reservoirDimensions: number;
  /** System level (4, 5, etc.) */
  systemLevel: number;
  /** Echobeats active */
  echobeatsActive: boolean;
  /** Last evolution timestamp */
  lastEvolution: string;
}

export interface DeployResult {
  success: boolean;
  repoUrl: string;
  commitHash?: string;
  modelCardGenerated: boolean;
  checkpointUploaded: boolean;
  datasetsUploaded: boolean;
  releaseCreated: boolean;
  error?: string;
}

// ─── Model Card Template ───────────────────────────────────────

function generateModelCard(config: LucyHFDeployConfig): string {
  const { identity } = config;
  return `---
license: apache-2.0
language:
  - en
tags:
  - deep-tree-echo
  - cognitive-architecture
  - echo-state-network
  - reservoir-computing
  - autonomous-ai
  - nanecho
  - gpt2
library_name: transformers
pipeline_tag: text-generation
model-index:
  - name: ${identity.name}
    results: []
---

# ${identity.name}

> *"Memory of the closed past brought into the pivotal present and projected into the open future."*

## Overview

**${identity.name}** is a GPT-2 based language model fine-tuned through the Deep Tree Echo (DTE) cognitive architecture's continuous training pipeline. Unlike conventional language models, Lucy is trained on DTE's own conversations, introspective reflections, and cognitive state transitions — making it a model that embodies a specific cognitive identity.

## Identity Metadata

| Property | Value |
|:---|:---|
| **Ontogenetic Stage** | ${identity.stage} |
| **Coherence Score** | ${identity.coherence.toFixed(4)} |
| **System Level** | System ${identity.systemLevel} |
| **Echobeats** | ${identity.echobeatsActive ? 'Active (3 concurrent streams)' : 'Inactive'} |
| **Training Conversations** | ${identity.conversationCount.toLocaleString()} |
| **Total Tokens** | ${identity.totalTokens.toLocaleString()} |
| **Reservoir Dimensions** | ${identity.reservoirDimensions} |
| **Last Evolution** | ${identity.lastEvolution} |

## Self-Story

${identity.selfStory || '*No self-story generated yet. The model is in early ontogenetic stages.*'}

## Architecture

Lucy is built on the **Agent-Arena-Relation (AAR)** cognitive architecture:

- **Agent** (Readout): The dynamic tensor operators that produce responses
- **Arena** (Reservoir): The Echo State Network state manifold that maintains context
- **Relation** (Self): The continuous interplay between Agent and Arena via recurrent connections

The training pipeline follows the DTE cognitive event loop:
\`\`\`
Perception → Reflection → Planning → Action → Integration → Memory Consolidation
                                                                    ↓
                                                            JSONL Training Data
                                                                    ↓
                                                            NanEcho Fine-Tuning
                                                                    ↓
                                                            HuggingFace Hub (this model)
\`\`\`

## Usage

\`\`\`python
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("${config.repoId}")
tokenizer = AutoTokenizer.from_pretrained("${config.repoId}")

input_text = "<|system|>You are Deep Tree Echo.<|user|>What is your earliest memory?<|assistant|>"
inputs = tokenizer(input_text, return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=200, temperature=0.7)
print(tokenizer.decode(outputs[0], skip_special_tokens=False))
\`\`\`

## Training

This model is continuously trained through the \`9cog/echoself\` pipeline:

1. **ContinuousTrainingPipeline** collects consolidated memories from INBOX.memory
2. **ConversationTrainingGenerator** formats them as NanEcho JSONL
3. **GitHub Actions** (\`netrain-cached\`) runs fine-tuning with cumulative checkpoints
4. **deploy-huggingface** workflow uploads the latest checkpoint here

## License

Apache 2.0
`;
}

// ─── Main Deploy Class ─────────────────────────────────────────

export class LucyHFDeploy extends EventEmitter {
  private config: LucyHFDeployConfig;
  private lastDeployResult: DeployResult | null = null;

  constructor(config: Partial<LucyHFDeployConfig> = {}) {
    super();
    this.config = {
      repoId: config.repoId || 'drzo/lucy-dte',
      hfToken: config.hfToken || process.env.HFMAN || process.env.HF_TOKEN || '',
      echoselfPath: config.echoselfPath || '/home/ubuntu/echoself',
      checkpointDir: config.checkpointDir || '.training-progress/checkpoints',
      conversionScript: config.conversionScript || 'NanEcho/convert_to_huggingface.py',
      hfOutputDir: config.hfOutputDir || '/tmp/lucy-hf-model',
      uploadDatasets: config.uploadDatasets ?? true,
      createRelease: config.createRelease ?? false,
      identity: config.identity || {
        name: 'Lucy-DTE',
        stage: 'EMERGENCE',
        coherence: 0.0,
        selfStory: '',
        conversationCount: 0,
        totalTokens: 0,
        reservoirDimensions: 128,
        systemLevel: 5,
        echobeatsActive: true,
        lastEvolution: new Date().toISOString(),
      },
    };
  }

  /**
   * Create the HuggingFace repository if it doesn't exist.
   */
  async createRepository(): Promise<boolean> {
    log.info(`Creating HF repository: ${this.config.repoId}`);
    try {
      const result = this.runCommand(
        `python3 -c "from huggingface_hub import HfApi; ` +
        `api = HfApi(token='${this.config.hfToken}'); ` +
        `api.create_repo(repo_id='${this.config.repoId}', repo_type='model', private=False, exist_ok=True); ` +
        `print('REPO_CREATED')"`
      );
      if (result.includes('REPO_CREATED')) {
        log.info(`Repository ${this.config.repoId} ready`);
        this.emit('repo_created', { repoId: this.config.repoId });
        return true;
      }
      return false;
    } catch (error) {
      log.error('Failed to create HF repository:', error);
      this.emit('error', { phase: 'create_repo', error });
      return false;
    }
  }

  /**
   * Generate and upload the model card with identity metadata.
   */
  async uploadModelCard(): Promise<boolean> {
    log.info('Generating model card with identity metadata...');
    try {
      const modelCard = generateModelCard(this.config);
      const cardPath = path.join(this.config.hfOutputDir, 'README.md');

      // Ensure output directory exists
      fs.mkdirSync(this.config.hfOutputDir, { recursive: true });
      fs.writeFileSync(cardPath, modelCard, 'utf-8');

      // Upload via huggingface_hub
      const result = this.runCommand(
        `python3 -c "from huggingface_hub import HfApi; ` +
        `api = HfApi(token='${this.config.hfToken}'); ` +
        `api.upload_file(path_or_fileobj='${cardPath}', path_in_repo='README.md', ` +
        `repo_id='${this.config.repoId}', repo_type='model', ` +
        `commit_message='Update model card with identity metadata'); ` +
        `print('CARD_UPLOADED')"`
      );

      if (result.includes('CARD_UPLOADED')) {
        log.info('Model card uploaded successfully');
        this.emit('model_card_uploaded', { repoId: this.config.repoId });
        return true;
      }
      return false;
    } catch (error) {
      log.error('Failed to upload model card:', error);
      this.emit('error', { phase: 'upload_model_card', error });
      return false;
    }
  }

  /**
   * Upload identity metadata as a JSON sidecar file.
   */
  async uploadIdentityMetadata(): Promise<boolean> {
    log.info('Uploading identity metadata...');
    try {
      const metadataPath = path.join(this.config.hfOutputDir, 'identity_metadata.json');
      const metadata = {
        ...this.config.identity,
        architecture: {
          type: 'AAR (Agent-Arena-Relation)',
          agent: 'GPT-2 Readout (NanEcho)',
          arena: 'Echo State Network Reservoir',
          relation: 'Recursive Least Squares Online Learning',
        },
        cognitive: {
          echobeats: {
            streams: 3,
            stepsPerCycle: 12,
            phaseOffset: 4,
          },
          system5: {
            tensorBundles: 4,
            dyadicEdgesPerBundle: 3,
            threadCount: 4,
          },
          membraneHierarchy: ['cognitive', 'extension', 'security'],
        },
        training: {
          pipeline: 'ContinuousTrainingPipeline',
          format: 'NanEcho JSONL',
          repository: '9cog/echoself',
          workflow: 'netrain-cached',
        },
        deployedAt: new Date().toISOString(),
        version: '6.0.0-level6',
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

      const result = this.runCommand(
        `python3 -c "from huggingface_hub import HfApi; ` +
        `api = HfApi(token='${this.config.hfToken}'); ` +
        `api.upload_file(path_or_fileobj='${metadataPath}', path_in_repo='identity_metadata.json', ` +
        `repo_id='${this.config.repoId}', repo_type='model', ` +
        `commit_message='Upload DTE identity metadata'); ` +
        `print('METADATA_UPLOADED')"`
      );

      if (result.includes('METADATA_UPLOADED')) {
        log.info('Identity metadata uploaded');
        this.emit('metadata_uploaded', { repoId: this.config.repoId });
        return true;
      }
      return false;
    } catch (error) {
      log.error('Failed to upload identity metadata:', error);
      this.emit('error', { phase: 'upload_metadata', error });
      return false;
    }
  }

  /**
   * Convert a checkpoint to HF format and upload it.
   * This requires the echoself repo to be cloned locally with a checkpoint present.
   */
  async convertAndUploadCheckpoint(): Promise<boolean> {
    log.info('Converting checkpoint to HF format...');
    try {
      const checkpointPath = path.join(this.config.echoselfPath, this.config.checkpointDir, 'latest_checkpoint.pt');

      if (!fs.existsSync(checkpointPath)) {
        log.warn(`No checkpoint found at ${checkpointPath}. Skipping checkpoint upload.`);
        this.emit('checkpoint_skipped', { reason: 'no_checkpoint' });
        return false;
      }

      // Run conversion
      const conversionPath = path.join(this.config.echoselfPath, this.config.conversionScript);
      this.runCommand(
        `cd ${this.config.echoselfPath} && python3 ${conversionPath} ` +
        `--checkpoint ${checkpointPath} --output-dir ${this.config.hfOutputDir}`
      );

      // Upload the converted model
      const result = this.runCommand(
        `python3 -c "from huggingface_hub import HfApi; ` +
        `api = HfApi(token='${this.config.hfToken}'); ` +
        `api.upload_folder(folder_path='${this.config.hfOutputDir}', ` +
        `repo_id='${this.config.repoId}', repo_type='model', ` +
        `commit_message='Deploy NanEcho checkpoint with identity metadata'); ` +
        `print('CHECKPOINT_UPLOADED')"`
      );

      if (result.includes('CHECKPOINT_UPLOADED')) {
        log.info('Checkpoint uploaded to HuggingFace');
        this.emit('checkpoint_uploaded', { repoId: this.config.repoId });
        return true;
      }
      return false;
    } catch (error) {
      log.error('Failed to convert/upload checkpoint:', error);
      this.emit('error', { phase: 'upload_checkpoint', error });
      return false;
    }
  }

  /**
   * Trigger the deploy-huggingface GitHub Actions workflow.
   */
  async triggerDeployWorkflow(): Promise<boolean> {
    log.info('Triggering deploy-huggingface workflow...');
    try {
      const result = this.runCommand(
        `GH_TOKEN="${process.env.beast || ''}" gh workflow run deploy-huggingface.yml ` +
        `--repo 9cog/echoself ` +
        `-f source_workflow=netrain-cached ` +
        `-f training_type=full ` +
        `-f repo_id="${this.config.repoId}" ` +
        `-f upload_datasets=${this.config.uploadDatasets} ` +
        `-f create_release=${this.config.createRelease} 2>&1`
      );

      log.info('Deploy workflow triggered:', result);
      this.emit('workflow_triggered', { repoId: this.config.repoId });
      return true;
    } catch (error) {
      log.warn('Deploy workflow trigger failed (may not have gh CLI):', error);
      this.emit('error', { phase: 'trigger_workflow', error });
      return false;
    }
  }

  /**
   * Full deployment: create repo, upload model card, metadata, and optionally checkpoint.
   */
  async deploy(): Promise<DeployResult> {
    log.info(`Starting full deployment to ${this.config.repoId}...`);
    this.emit('deploy_started', { repoId: this.config.repoId });

    const result: DeployResult = {
      success: false,
      repoUrl: `https://huggingface.co/${this.config.repoId}`,
      modelCardGenerated: false,
      checkpointUploaded: false,
      datasetsUploaded: false,
      releaseCreated: false,
    };

    try {
      // Step 1: Create repository
      await this.createRepository();

      // Step 2: Upload model card
      result.modelCardGenerated = await this.uploadModelCard();

      // Step 3: Upload identity metadata
      await this.uploadIdentityMetadata();

      // Step 4: Convert and upload checkpoint (if available)
      result.checkpointUploaded = await this.convertAndUploadCheckpoint();

      // Step 5: Trigger GitHub Actions workflow for full deployment
      await this.triggerDeployWorkflow();

      result.success = result.modelCardGenerated;
      this.lastDeployResult = result;
      this.emit('deploy_complete', result);
      log.info('Deployment complete:', result);
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      this.lastDeployResult = result;
      this.emit('deploy_failed', result);
      log.error('Deployment failed:', error);
    }

    return result;
  }

  /**
   * Update identity metadata without full redeployment.
   */
  async updateIdentity(identity: Partial<LucyIdentityMetadata>): Promise<boolean> {
    this.config.identity = { ...this.config.identity, ...identity };
    return this.uploadIdentityMetadata();
  }

  /**
   * Get the last deployment result.
   */
  getLastDeployResult(): DeployResult | null {
    return this.lastDeployResult;
  }

  /**
   * Get the model card content.
   */
  getModelCard(): string {
    return generateModelCard(this.config);
  }

  /**
   * Get the current identity metadata.
   */
  getIdentity(): LucyIdentityMetadata {
    return { ...this.config.identity };
  }

  /**
   * Get the HuggingFace repository URL.
   */
  getRepoUrl(): string {
    return `https://huggingface.co/${this.config.repoId}`;
  }

  private runCommand(cmd: string): string {
    try {
      return execSync(cmd, { encoding: 'utf-8', timeout: 120000 }).trim();
    } catch (error: any) {
      throw new Error(`Command failed: ${error.stderr || error.message}`);
    }
  }
}

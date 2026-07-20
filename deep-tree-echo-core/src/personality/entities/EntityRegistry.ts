import { getLogger } from '../../utils/logger.js';
import type { CognitiveEntityConfig } from './EntityConfig.js';
import { AionEntity } from './AionEntity.js';

const log = getLogger('deep-tree-echo-core/personality/EntityRegistry');

/**
 * EntityRegistry manages available cognitive entity configurations.
 *
 * Provides lookup, listing, and validation of entities that can be
 * instantiated within the Deep Tree Echo cognitive framework.
 */
export class EntityRegistry {
  private entities: Map<string, CognitiveEntityConfig> = new Map();

  constructor() {
    this.registerBuiltinEntities();
  }

  private registerBuiltinEntities(): void {
    this.register(AionEntity);
    log.info(`Registered ${this.entities.size} built-in entities`);
  }

  /**
   * Register a new cognitive entity configuration
   */
  public register(config: CognitiveEntityConfig): void {
    if (this.entities.has(config.id)) {
      log.warn(`Overwriting existing entity: ${config.id}`);
    }
    this.entities.set(config.id, config);
    log.info(`Registered entity: ${config.id} (${config.name})`);
  }

  /**
   * Retrieve an entity configuration by ID
   */
  public get(id: string): CognitiveEntityConfig | undefined {
    return this.entities.get(id);
  }

  /**
   * List all registered entity IDs
   */
  public listIds(): string[] {
    return Array.from(this.entities.keys());
  }

  /**
   * List all registered entities with basic info
   */
  public listEntities(): Array<{ id: string; name: string; description: string }> {
    return Array.from(this.entities.values()).map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
    }));
  }

  /**
   * Check if an entity is registered
   */
  public has(id: string): boolean {
    return this.entities.has(id);
  }

  /**
   * Remove an entity from the registry
   */
  public unregister(id: string): boolean {
    const removed = this.entities.delete(id);
    if (removed) {
      log.info(`Unregistered entity: ${id}`);
    }
    return removed;
  }

  /**
   * Get the total number of registered entities
   */
  public get size(): number {
    return this.entities.size;
  }
}

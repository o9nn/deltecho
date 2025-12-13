/**
 * Distributed Coordinator - Multi-Node AGI Coordination
 * 
 * Coordinates cognitive processing across multiple Inferno kernel instances,
 * enabling true distributed AGI where intelligence emerges from networked
 * kernel nodes working in concert.
 */

import { Atom, AtomSpace } from '../atomspace/AtomSpace.js'

export interface NodeInfo {
  nodeId: string
  address: string
  port: number
  capabilities: string[]
  load: number
  lastHeartbeat: number
}

export interface DistributedTask {
  taskId: string
  type: 'reasoning' | 'learning' | 'pattern-matching'
  atomSpaceSnapshot: string
  assignedNode?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: any
}

export interface CoordinatorConfig {
  nodeId: string
  heartbeatInterval: number
  taskTimeout: number
  replicationFactor: number
}

/**
 * DistributedCoordinator - Kernel-level distributed AGI coordination
 */
export class DistributedCoordinator {
  private config: CoordinatorConfig
  private nodes: Map<string, NodeInfo>
  private tasks: Map<string, DistributedTask>
  private localAtomSpace: AtomSpace
  private nextTaskId: number

  constructor(
    localAtomSpace: AtomSpace,
    config: Partial<CoordinatorConfig> = {}
  ) {
    this.localAtomSpace = localAtomSpace
    this.config = {
      nodeId: config.nodeId || `node_${Math.random().toString(36).substr(2, 9)}`,
      heartbeatInterval: config.heartbeatInterval || 5000,
      taskTimeout: config.taskTimeout || 30000,
      replicationFactor: config.replicationFactor || 2,
    }
    this.nodes = new Map()
    this.tasks = new Map()
    this.nextTaskId = 1

    this.initializeNode()
  }

  /**
   * Initialize this node in the distributed system
   */
  private initializeNode(): void {
    const localNode: NodeInfo = {
      nodeId: this.config.nodeId,
      address: 'localhost',
      port: 8080,
      capabilities: ['reasoning', 'learning', 'pattern-matching'],
      load: 0,
      lastHeartbeat: Date.now(),
    }
    this.nodes.set(this.config.nodeId, localNode)
    
    console.log(`[DistributedCoordinator] Node ${this.config.nodeId} initialized`)
  }

  /**
   * Register a new node in the distributed system
   */
  registerNode(node: Omit<NodeInfo, 'lastHeartbeat'>): void {
    const nodeInfo: NodeInfo = {
      ...node,
      lastHeartbeat: Date.now(),
    }
    this.nodes.set(node.nodeId, nodeInfo)
    
    console.log(`[DistributedCoordinator] Registered node ${node.nodeId}`)
  }

  /**
   * Send heartbeat to maintain node liveness
   */
  heartbeat(nodeId: string): void {
    const node = this.nodes.get(nodeId)
    if (node) {
      node.lastHeartbeat = Date.now()
    }
  }

  /**
   * Check for dead nodes
   */
  pruneDeadNodes(): string[] {
    const now = Date.now()
    const deadNodes: string[] = []
    const timeout = this.config.heartbeatInterval * 3

    for (const [nodeId, node] of this.nodes.entries()) {
      if (nodeId === this.config.nodeId) continue // Don't prune self
      
      if (now - node.lastHeartbeat > timeout) {
        deadNodes.push(nodeId)
        this.nodes.delete(nodeId)
      }
    }

    if (deadNodes.length > 0) {
      console.log(`[DistributedCoordinator] Pruned dead nodes: ${deadNodes.join(', ')}`)
    }

    return deadNodes
  }

  /**
   * Create a distributed task
   */
  createTask(
    type: DistributedTask['type'],
    atomSpaceSnapshot: string
  ): string {
    const taskId = `task_${this.nextTaskId++}`
    
    const task: DistributedTask = {
      taskId,
      type,
      atomSpaceSnapshot,
      status: 'pending',
    }

    this.tasks.set(taskId, task)
    console.log(`[DistributedCoordinator] Created task ${taskId} of type ${type}`)
    
    return taskId
  }

  /**
   * Assign task to best available node
   */
  assignTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    // Find node with lowest load and required capabilities
    let bestNode: NodeInfo | null = null
    let minLoad = Infinity

    for (const node of this.nodes.values()) {
      if (node.capabilities.includes(task.type) && node.load < minLoad) {
        bestNode = node
        minLoad = node.load
      }
    }

    if (!bestNode) {
      console.log(`[DistributedCoordinator] No suitable node for task ${taskId}`)
      return false
    }

    task.assignedNode = bestNode.nodeId
    task.status = 'running'
    bestNode.load++

    console.log(`[DistributedCoordinator] Assigned task ${taskId} to node ${bestNode.nodeId}`)
    return true
  }

  /**
   * Complete a task
   */
  completeTask(taskId: string, result: any): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    task.status = 'completed'
    task.result = result

    // Reduce node load
    if (task.assignedNode) {
      const node = this.nodes.get(task.assignedNode)
      if (node) {
        node.load = Math.max(0, node.load - 1)
      }
    }

    console.log(`[DistributedCoordinator] Task ${taskId} completed`)
    return true
  }

  /**
   * Distribute atoms across nodes for redundancy
   */
  replicateAtoms(atoms: Atom[]): Map<string, Atom[]> {
    const distribution = new Map<string, Atom[]>()
    
    for (const atom of atoms) {
      // Assign to multiple nodes based on replication factor
      const nodes = this.selectNodesForReplication(this.config.replicationFactor)
      
      for (const nodeId of nodes) {
        if (!distribution.has(nodeId)) {
          distribution.set(nodeId, [])
        }
        distribution.get(nodeId)!.push(atom)
      }
    }

    console.log(
      `[DistributedCoordinator] Replicated ${atoms.length} atoms across ${distribution.size} nodes`
    )
    
    return distribution
  }

  /**
   * Select nodes for replication
   */
  private selectNodesForReplication(count: number): string[] {
    const availableNodes = Array.from(this.nodes.keys())
    const selected: string[] = []

    // Simple selection - take first N nodes
    for (let i = 0; i < Math.min(count, availableNodes.length); i++) {
      selected.push(availableNodes[i])
    }

    return selected
  }

  /**
   * Synchronize AtomSpace across nodes
   */
  async synchronizeAtomSpace(): Promise<void> {
    console.log('[DistributedCoordinator] Synchronizing AtomSpace across nodes...')
    
    const localAtoms = this.localAtomSpace.getAllAtoms()
    const distribution = this.replicateAtoms(localAtoms)

    // In a real implementation, this would send atoms to remote nodes
    // For now, we just log the distribution
    for (const [nodeId, atoms] of distribution.entries()) {
      console.log(`[DistributedCoordinator] Node ${nodeId}: ${atoms.length} atoms`)
    }
  }

  /**
   * Get coordinator statistics
   */
  getStats(): {
    totalNodes: number
    activeNodes: number
    totalTasks: number
    pendingTasks: number
    runningTasks: number
    completedTasks: number
  } {
    const tasks = Array.from(this.tasks.values())
    
    return {
      totalNodes: this.nodes.size,
      activeNodes: this.nodes.size,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      runningTasks: tasks.filter(t => t.status === 'running').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
    }
  }

  /**
   * Get all registered nodes
   */
  getNodes(): NodeInfo[] {
    return Array.from(this.nodes.values())
  }

  /**
   * Get all tasks
   */
  getTasks(): DistributedTask[] {
    return Array.from(this.tasks.values())
  }
}

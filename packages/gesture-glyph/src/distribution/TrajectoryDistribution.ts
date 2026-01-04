/**
 * Trajectory Distribution System
 * 
 * Implements deep tree echo distribution:
 * - Nested partition structure (enneagram, polar numbers)
 * - Hierarchical trajectory clustering
 * - Multi-scale pattern recognition
 */

import { Trajectory, Glyph } from '../glyph/types';

/**
 * Distribution node in the tree
 */
export interface DistributionNode {
  /** Node ID */
  id: string;
  
  /** Parent node ID */
  parentId: string | null;
  
  /** Depth in tree */
  depth: number;
  
  /** Partition number (base for this level) */
  partition: number;
  
  /** Trajectories in this partition */
  trajectories: string[]; // trajectory IDs
  
  /** Child nodes */
  children: string[]; // child node IDs
  
  /** Centroid glyph */
  centroid: Glyph | null;
  
  /** Statistics */
  stats: {
    count: number;
    avgSuccess: number;
    avgCost: number;
    avgDuration: number;
  };
}

/**
 * Deep tree echo structure
 */
export interface DeepTreeEcho {
  /** Root node */
  root: DistributionNode;
  
  /** All nodes indexed by ID */
  nodes: Map<string, DistributionNode>;
  
  /** Trajectory index */
  trajectories: Map<string, Trajectory>;
  
  /** Glyph index */
  glyphs: Map<string, Glyph>;
  
  /** Partition sequence (3, 5, 7, 9, 11, ...) */
  partitionSequence: number[];
  
  /** Maximum depth */
  maxDepth: number;
}

/**
 * Trajectory Distribution Configuration
 */
export interface TrajectoryDistributionConfig {
  /** Partition sequence (odd numbers) */
  partitionSequence: number[];
  
  /** Maximum tree depth */
  maxDepth: number;
  
  /** Minimum trajectories per node */
  minTrajectoriesPerNode: number;
  
  /** Distance metric */
  distanceMetric: 'euclidean' | 'cosine' | 'dtw';
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TrajectoryDistributionConfig = {
  partitionSequence: [3, 5, 7, 9, 11, 13], // Odd bases
  maxDepth: 6,
  minTrajectoriesPerNode: 5,
  distanceMetric: 'euclidean',
};

/**
 * Trajectory Distribution System
 */
export class TrajectoryDistribution {
  private config: TrajectoryDistributionConfig;
  private echo: DeepTreeEcho | null = null;
  
  constructor(config: Partial<TrajectoryDistributionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Build deep tree echo from trajectories
   */
  buildEcho(trajectories: Trajectory[], glyphs: Map<string, Glyph>): DeepTreeEcho {
    // Initialize echo structure
    const echo: DeepTreeEcho = {
      root: this.createRootNode(trajectories),
      nodes: new Map(),
      trajectories: new Map(trajectories.map(t => [t.id, t])),
      glyphs,
      partitionSequence: this.config.partitionSequence,
      maxDepth: this.config.maxDepth,
    };
    
    // Add root to nodes
    echo.nodes.set(echo.root.id, echo.root);
    
    // Recursively partition trajectories
    this.partitionNode(echo, echo.root, 0);
    
    this.echo = echo;
    return echo;
  }
  
  /**
   * Create root node
   */
  private createRootNode(trajectories: Trajectory[]): DistributionNode {
    return {
      id: 'root',
      parentId: null,
      depth: 0,
      partition: 1,
      trajectories: trajectories.map(t => t.id),
      children: [],
      centroid: null,
      stats: this.calculateStats(trajectories),
    };
  }
  
  /**
   * Recursively partition node
   */
  private partitionNode(
    echo: DeepTreeEcho,
    node: DistributionNode,
    depth: number
  ): void {
    // Stop if max depth reached or too few trajectories
    if (
      depth >= this.config.maxDepth ||
      node.trajectories.length < this.config.minTrajectoriesPerNode
    ) {
      return;
    }
    
    // Get partition number for this depth
    const partitionNum = this.config.partitionSequence[depth % this.config.partitionSequence.length];
    
    // Get trajectories for this node
    const trajectories = node.trajectories
      .map(id => echo.trajectories.get(id))
      .filter(t => t !== undefined) as Trajectory[];
    
    // Cluster trajectories into partitionNum groups
    const clusters = this.clusterTrajectories(trajectories, partitionNum);
    
    // Create child nodes
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      
      if (cluster.length === 0) {
        continue;
      }
      
      const childNode: DistributionNode = {
        id: `${node.id}-${i}`,
        parentId: node.id,
        depth: depth + 1,
        partition: partitionNum,
        trajectories: cluster.map(t => t.id),
        children: [],
        centroid: null,
        stats: this.calculateStats(cluster),
      };
      
      // Add child to parent
      node.children.push(childNode.id);
      
      // Add child to echo
      echo.nodes.set(childNode.id, childNode);
      
      // Recursively partition child
      this.partitionNode(echo, childNode, depth + 1);
    }
  }
  
  /**
   * Cluster trajectories using k-means
   */
  private clusterTrajectories(
    trajectories: Trajectory[],
    k: number
  ): Trajectory[][] {
    if (trajectories.length <= k) {
      // If fewer trajectories than clusters, each gets its own cluster
      return trajectories.map(t => [t]);
    }
    
    // Extract features from trajectories
    const features = trajectories.map(t => this.extractFeatures(t));
    
    // Initialize centroids randomly
    let centroids = this.initializeCentroids(features, k);
    
    // K-means iterations
    const maxIterations = 100;
    let assignments: number[] = [];
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign each trajectory to nearest centroid
      const newAssignments = features.map(f =>
        this.findNearestCentroid(f, centroids)
      );
      
      // Check for convergence
      if (this.arraysEqual(assignments, newAssignments)) {
        break;
      }
      
      assignments = newAssignments;
      
      // Update centroids
      centroids = this.updateCentroids(features, assignments, k);
    }
    
    // Group trajectories by cluster
    const clusters: Trajectory[][] = Array.from({ length: k }, () => []);
    
    for (let i = 0; i < trajectories.length; i++) {
      clusters[assignments[i]].push(trajectories[i]);
    }
    
    return clusters;
  }
  
  /**
   * Extract features from trajectory
   */
  private extractFeatures(trajectory: Trajectory): number[] {
    const features: number[] = [];
    
    // Duration
    features.push((trajectory.endTime - trajectory.startTime) / 1000);
    
    // Number of actions
    features.push(trajectory.actions.length);
    
    // Success indicator
    features.push(trajectory.success ? 1 : 0);
    
    // Average action velocity
    const avgVelocity = trajectory.actions.reduce((sum, a) => sum + (a.velocity || 0), 0) / 
                       (trajectory.actions.length || 1);
    features.push(avgVelocity);
    
    // Path length (sum of distances between consecutive actions)
    let pathLength = 0;
    for (let i = 1; i < trajectory.actions.length; i++) {
      const prev = trajectory.actions[i - 1];
      const curr = trajectory.actions[i];
      
      if (prev.location && curr.location) {
        pathLength += this.euclideanDistance(
          this.locationToArray(prev.location),
          this.locationToArray(curr.location)
        );
      }
    }
    features.push(pathLength);
    
    return features;
  }
  
  /**
   * Convert location to array
   */
  private locationToArray(location: any): number[] {
    if ('z' in location) {
      return [location.x, location.y, location.z];
    } else {
      return [location.x, location.y];
    }
  }
  
  /**
   * Initialize centroids randomly
   */
  private initializeCentroids(features: number[][], k: number): number[][] {
    const centroids: number[][] = [];
    const indices = new Set<number>();
    
    while (centroids.length < k && indices.size < features.length) {
      const idx = Math.floor(Math.random() * features.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        centroids.push([...features[idx]]);
      }
    }
    
    return centroids;
  }
  
  /**
   * Find nearest centroid
   */
  private findNearestCentroid(features: number[], centroids: number[][]): number {
    let minDist = Infinity;
    let nearest = 0;
    
    for (let i = 0; i < centroids.length; i++) {
      const dist = this.euclideanDistance(features, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }
    
    return nearest;
  }
  
  /**
   * Update centroids
   */
  private updateCentroids(
    features: number[][],
    assignments: number[],
    k: number
  ): number[][] {
    const centroids: number[][] = Array.from({ length: k }, () => []);
    const counts: number[] = Array.from({ length: k }, () => 0);
    
    // Sum features for each cluster
    for (let i = 0; i < features.length; i++) {
      const cluster = assignments[i];
      counts[cluster]++;
      
      if (centroids[cluster].length === 0) {
        centroids[cluster] = [...features[i]];
      } else {
        for (let j = 0; j < features[i].length; j++) {
          centroids[cluster][j] += features[i][j];
        }
      }
    }
    
    // Average
    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        for (let j = 0; j < centroids[i].length; j++) {
          centroids[i][j] /= counts[i];
        }
      }
    }
    
    return centroids;
  }
  
  /**
   * Euclidean distance
   */
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }
  
  /**
   * Check if arrays are equal
   */
  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Calculate statistics for trajectories
   */
  private calculateStats(trajectories: Trajectory[]): {
    count: number;
    avgSuccess: number;
    avgCost: number;
    avgDuration: number;
  } {
    if (trajectories.length === 0) {
      return {
        count: 0,
        avgSuccess: 0,
        avgCost: 0,
        avgDuration: 0,
      };
    }
    
    const successCount = trajectories.filter(t => t.success).length;
    const avgSuccess = successCount / trajectories.length;
    
    const avgDuration = trajectories.reduce(
      (sum, t) => sum + (t.endTime - t.startTime),
      0
    ) / trajectories.length;
    
    return {
      count: trajectories.length,
      avgSuccess,
      avgCost: 0, // TODO: extract cost from metadata
      avgDuration,
    };
  }
  
  /**
   * Query trajectories by path in tree
   */
  queryByPath(path: number[]): Trajectory[] {
    if (!this.echo) {
      return [];
    }
    
    let node = this.echo.root;
    
    for (const index of path) {
      if (index >= node.children.length) {
        break;
      }
      
      const childId = node.children[index];
      const childNode = this.echo.nodes.get(childId);
      
      if (!childNode) {
        break;
      }
      
      node = childNode;
    }
    
    return node.trajectories
      .map(id => this.echo!.trajectories.get(id))
      .filter(t => t !== undefined) as Trajectory[];
  }
  
  /**
   * Get echo structure
   */
  getEcho(): DeepTreeEcho | null {
    return this.echo;
  }
  
  /**
   * Export echo as JSON
   */
  exportEcho(): string {
    if (!this.echo) {
      return '{}';
    }
    
    const exportData = {
      root: this.echo.root,
      nodes: Array.from(this.echo.nodes.entries()),
      partitionSequence: this.echo.partitionSequence,
      maxDepth: this.echo.maxDepth,
    };
    
    return JSON.stringify(exportData, null, 2);
  }
}

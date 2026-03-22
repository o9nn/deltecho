import {
  A000055,
  A000081,
  integerPartitions,
  partitionCount,
  buildFlipTransform,
  verifyFlipTransform,
  verifyAllFlipTransforms,
  getClusterForTerm,
  type SystemLevel,
} from '../cosmic-order/index.js';

describe('Mathar Flip Transform — free trees → rooted trees', () => {
  // ============================================================
  // A000055 (Free/Unrooted Trees)
  // ============================================================

  describe('A000055 sequence', () => {
    it('should have correct values for n=0..9', () => {
      // A000055: 1, 1, 1, 1, 2, 3, 6, 11, 23, 47
      expect(A000055[0]).toBe(1);
      expect(A000055[1]).toBe(1);
      expect(A000055[2]).toBe(1);
      expect(A000055[3]).toBe(1);
      expect(A000055[4]).toBe(2);
      expect(A000055[5]).toBe(3);
      expect(A000055[6]).toBe(6);
      expect(A000055[7]).toBe(11);
      expect(A000055[8]).toBe(23);
      expect(A000055[9]).toBe(47);
    });

    it('cluster counts should match A000055 for each system', () => {
      const expectedClusters = [1, 1, 2, 3, 6, 11]; // A000055[2..7]
      for (let n = 1; n <= 6; n++) {
        const transform = buildFlipTransform(n as SystemLevel);
        expect(transform.clusterCount).toBe(expectedClusters[n - 1]);
      }
    });
  });

  // ============================================================
  // Integer Partitions
  // ============================================================

  describe('integer partitions', () => {
    it('partitions of 1 = [[1]]', () => {
      const p = integerPartitions(1);
      expect(p).toHaveLength(1);
      expect(p[0].parts).toEqual([1]);
    });

    it('partitions of 2 = [[2], [1,1]]', () => {
      const p = integerPartitions(2);
      expect(p).toHaveLength(2);
      expect(p[0].parts).toEqual([2]);
      expect(p[1].parts).toEqual([1, 1]);
    });

    it('partitions of 3 = [[3], [2,1], [1,1,1]]', () => {
      const p = integerPartitions(3);
      expect(p).toHaveLength(3);
      expect(p[0].parts).toEqual([3]);
      expect(p[1].parts).toEqual([2, 1]);
      expect(p[2].parts).toEqual([1, 1, 1]);
    });

    it('partitions of 4 should have 5 elements', () => {
      const p = integerPartitions(4);
      expect(p).toHaveLength(5);
    });

    it('partitions of 5 should have 7 elements', () => {
      const p = integerPartitions(5);
      expect(p).toHaveLength(7);
    });

    it('partitions of 6 should have 11 elements', () => {
      const p = integerPartitions(6);
      expect(p).toHaveLength(11);
    });

    it('partitions of 7 should have 15 elements', () => {
      const p = integerPartitions(7);
      expect(p).toHaveLength(15);
    });

    it('partition count follows A000041', () => {
      // A000041: 1, 1, 2, 3, 5, 7, 11, 15, 22, 30
      expect(partitionCount(0)).toBe(1);
      expect(partitionCount(1)).toBe(1);
      expect(partitionCount(2)).toBe(2);
      expect(partitionCount(3)).toBe(3);
      expect(partitionCount(4)).toBe(5);
      expect(partitionCount(5)).toBe(7);
      expect(partitionCount(6)).toBe(11);
      expect(partitionCount(7)).toBe(15);
    });

    it('all parts should be non-increasing', () => {
      for (let n = 1; n <= 7; n++) {
        for (const p of integerPartitions(n)) {
          for (let i = 1; i < p.parts.length; i++) {
            expect(p.parts[i]).toBeLessThanOrEqual(p.parts[i - 1]);
          }
        }
      }
    });

    it('all parts should sum to n', () => {
      for (let n = 1; n <= 7; n++) {
        for (const p of integerPartitions(n)) {
          const sum = p.parts.reduce((a, b) => a + b, 0);
          expect(sum).toBe(n);
          expect(p.n).toBe(n);
        }
      }
    });

    it('label should be parts joined by +', () => {
      const p = integerPartitions(4);
      expect(p[0].label).toBe('4');
      expect(p[1].label).toBe('3+1');
      expect(p[2].label).toBe('2+2');
      expect(p[3].label).toBe('2+1+1');
      expect(p[4].label).toBe('1+1+1+1');
    });
  });

  // ============================================================
  // Flip Transform: Cluster → Term Mapping
  // ============================================================

  describe('flip transform structure', () => {
    it('Sys1: 1 cluster → 1 term', () => {
      const t = buildFlipTransform(1);
      expect(t.clusterCount).toBe(1);
      expect(t.termCount).toBe(1);
      expect(t.verifiedTermCount).toBe(1);
      expect(t.clusters[0].rootedCount).toBe(1);
    });

    it('Sys2: 1 cluster → 2 terms', () => {
      const t = buildFlipTransform(2);
      expect(t.clusterCount).toBe(1);
      expect(t.termCount).toBe(2);
      expect(t.verifiedTermCount).toBe(2);
      expect(t.clusters[0].rootedCount).toBe(2);
    });

    it('Sys3: 2 clusters → 4 terms', () => {
      const t = buildFlipTransform(3);
      expect(t.clusterCount).toBe(2);
      expect(t.termCount).toBe(4);
      expect(t.verifiedTermCount).toBe(4);
      // 2 + 2 = 4
      expect(t.clusters[0].rootedCount + t.clusters[1].rootedCount).toBe(4);
    });

    it('Sys4: 3 clusters → 9 terms', () => {
      const t = buildFlipTransform(4);
      expect(t.clusterCount).toBe(3);
      expect(t.termCount).toBe(9);
      expect(t.verifiedTermCount).toBe(9);
      // 3 + 4 + 2 = 9
      const sum = t.clusters.reduce((s, c) => s + c.rootedCount, 0);
      expect(sum).toBe(9);
    });

    it('Sys5: 6 clusters → 20 terms', () => {
      const t = buildFlipTransform(5);
      expect(t.clusterCount).toBe(6);
      expect(t.termCount).toBe(20);
      expect(t.verifiedTermCount).toBe(20);
      // 3 + 5 + 3 + 4 + 3 + 2 = 20
      const sum = t.clusters.reduce((s, c) => s + c.rootedCount, 0);
      expect(sum).toBe(20);
    });

    it('Sys6: 11 clusters → 48 terms', () => {
      const t = buildFlipTransform(6);
      expect(t.clusterCount).toBe(11);
      expect(t.termCount).toBe(48);
      expect(t.verifiedTermCount).toBe(48);
      // 4+6+4+6+5+4+3+5+4+5+2 = 48
      const sum = t.clusters.reduce((s, c) => s + c.rootedCount, 0);
      expect(sum).toBe(48);
    });
  });

  // ============================================================
  // Cluster Term Index Coverage
  // ============================================================

  describe('cluster term index coverage', () => {
    it('every term index 1..a(N+1) should be covered by exactly one cluster', () => {
      for (let n = 1; n <= 6; n++) {
        const t = buildFlipTransform(n as SystemLevel);
        const allIndices = new Set<number>();

        for (const cluster of t.clusters) {
          for (const idx of cluster.termIndices) {
            // No duplicates
            expect(allIndices.has(idx)).toBe(false);
            allIndices.add(idx);
          }
          // Each cluster's termIndices length matches rootedCount
          expect(cluster.termIndices.length).toBe(cluster.rootedCount);
        }

        // All indices 1..termCount should be present
        expect(allIndices.size).toBe(t.termCount);
        for (let i = 1; i <= t.termCount; i++) {
          expect(allIndices.has(i)).toBe(true);
        }
      }
    });

    it('getClusterForTerm should return correct cluster for each term', () => {
      for (let n = 1; n <= 6; n++) {
        const t = buildFlipTransform(n as SystemLevel);
        for (const cluster of t.clusters) {
          for (const termIdx of cluster.termIndices) {
            expect(getClusterForTerm(n as SystemLevel, termIdx)).toBe(cluster.index);
          }
        }
      }
    });

    it('getClusterForTerm should return -1 for invalid term index', () => {
      expect(getClusterForTerm(1, 99)).toBe(-1);
      expect(getClusterForTerm(4, 0)).toBe(-1);
      expect(getClusterForTerm(6, 49)).toBe(-1);
    });
  });

  // ============================================================
  // Symmetry Partitions
  // ============================================================

  describe('symmetry partitions', () => {
    it('each cluster should have a valid symmetry partition', () => {
      for (let n = 1; n <= 6; n++) {
        const t = buildFlipTransform(n as SystemLevel);
        for (const cluster of t.clusters) {
          const p = cluster.symmetryPartition;
          // Parts should sum to node count
          const sum = p.parts.reduce((a, b) => a + b, 0);
          expect(sum).toBe(t.nodes);
          // Parts should be non-increasing
          for (let i = 1; i < p.parts.length; i++) {
            expect(p.parts[i]).toBeLessThanOrEqual(p.parts[i - 1]);
          }
        }
      }
    });

    it('Sys4 clusters should have distinct symmetry partitions', () => {
      const t = buildFlipTransform(4);
      const labels = t.clusters.map(c => c.symmetryPartition.label);
      expect(labels).toEqual(['4+1', '2+2+1', '2+1+1+1']);
    });

    it('Sys6 clusters should have 11 distinct symmetry partitions', () => {
      const t = buildFlipTransform(6);
      const labels = new Set(t.clusters.map(c => c.symmetryPartition.label));
      expect(labels.size).toBe(11);
    });
  });

  // ============================================================
  // Verification Functions
  // ============================================================

  describe('verification', () => {
    it('verifyFlipTransform should pass for all levels', () => {
      for (let n = 1; n <= 6; n++) {
        const result = verifyFlipTransform(n as SystemLevel);
        expect(result.valid).toBe(true);
        expect(result.details.clustersValid).toBe(true);
        expect(result.details.termsValid).toBe(true);
      }
    });

    it('verifyAllFlipTransforms should pass', () => {
      const result = verifyAllFlipTransforms();
      expect(result.valid).toBe(true);
      expect(result.results).toHaveLength(6);
    });

    it('verification details should have correct node counts', () => {
      for (let n = 1; n <= 6; n++) {
        const result = verifyFlipTransform(n as SystemLevel);
        expect(result.details.nodes).toBe(n + 1);
        expect(result.details.level).toBe(n);
      }
    });
  });

  // ============================================================
  // Transform Matrix
  // ============================================================

  describe('transform matrix', () => {
    it('matrix should have one row per cluster', () => {
      for (let n = 1; n <= 6; n++) {
        const t = buildFlipTransform(n as SystemLevel);
        expect(t.matrix.length).toBe(t.clusterCount);
      }
    });

    it('sum of totalRooted across matrix rows should equal termCount', () => {
      for (let n = 1; n <= 6; n++) {
        const t = buildFlipTransform(n as SystemLevel);
        const sum = t.matrix.reduce((s, row) => s + row.totalRooted, 0);
        expect(sum).toBe(t.termCount);
      }
    });

    it('each matrix row should have freeTrees = 1', () => {
      for (let n = 1; n <= 6; n++) {
        const t = buildFlipTransform(n as SystemLevel);
        for (const row of t.matrix) {
          expect(row.freeTrees).toBe(1);
        }
      }
    });

    it('rootingsPerTree × freeTrees = totalRooted for each row', () => {
      for (let n = 1; n <= 6; n++) {
        const t = buildFlipTransform(n as SystemLevel);
        for (const row of t.matrix) {
          expect(row.rootingsPerTree * row.freeTrees).toBe(row.totalRooted);
        }
      }
    });
  });

  // ============================================================
  // Otter's Formula Relationship
  // ============================================================

  describe('Otter formula relationship', () => {
    it('A000081[n] >= A000055[n] for all n >= 1', () => {
      // A000081 has entries up to index 8, A000055 up to index 9
      const maxN = Math.min(A000081.length, A000055.length) - 1;
      for (let n = 1; n <= maxN; n++) {
        expect(A000081[n]).toBeGreaterThanOrEqual(A000055[n]);
      }
    });

    it('ratio A000081/A000055 should increase with n', () => {
      // The ratio of rooted to free trees increases
      const ratios: number[] = [];
      for (let n = 2; n <= 7; n++) {
        ratios.push(A000081[n] / A000055[n]);
      }
      // Each ratio should be >= previous (approximately)
      for (let i = 1; i < ratios.length; i++) {
        expect(ratios[i]).toBeGreaterThanOrEqual(ratios[i - 1] * 0.9); // Allow small tolerance
      }
    });
  });
});

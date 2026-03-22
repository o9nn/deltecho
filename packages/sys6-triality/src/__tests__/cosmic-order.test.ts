import {
  getSystemDefinition,
  getAllSystemDefinitions,
  verifyA000081Constraint,
  verifyTriadicRecurrence,
  A000081,
  type SystemLevel,
  type SystemDefinition,
} from '../cosmic-order/index.js';

describe('Cosmic Order — sys1-6 hierarchical composition', () => {
  // ============================================================
  // A000081 Constraint
  // ============================================================

  describe('A000081 constraint', () => {
    it('should verify all 6 systems satisfy a(N+1) term count', () => {
      const result = verifyA000081Constraint();
      expect(result.valid).toBe(true);

      for (const r of result.results) {
        expect(r.actual).toBe(r.expected);
        expect(r.valid).toBe(true);
      }
    });

    it('A000081 sequence should be [0, 1, 1, 2, 4, 9, 20, 48, 115]', () => {
      expect(A000081[0]).toBe(0);
      expect(A000081[1]).toBe(1);
      expect(A000081[2]).toBe(1);
      expect(A000081[3]).toBe(2);
      expect(A000081[4]).toBe(4);
      expect(A000081[5]).toBe(9);
      expect(A000081[6]).toBe(20);
      expect(A000081[7]).toBe(48);
      expect(A000081[8]).toBe(115);
    });

    it('System N should have exactly N centres', () => {
      for (let n = 1; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        expect(def.centreCount).toBe(n);
        expect(def.centres.length).toBe(n);
      }
    });

    it('System N should have exactly a(N+1) terms', () => {
      const expected = [1, 2, 4, 9, 20, 48];
      for (let n = 1; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        expect(def.termCount).toBe(expected[n - 1]);
        expect(def.terms.length).toBe(expected[n - 1]);
      }
    });

    it('System N should have N+1 nodes', () => {
      for (let n = 1; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        expect(def.nodeCount).toBe(n + 1);
      }
    });
  });

  // ============================================================
  // Triadic Recurrence
  // ============================================================

  describe('triadic recurrence', () => {
    it('should verify Sys1↔Sys4, Sys2↔Sys5, Sys3↔Sys6', () => {
      const result = verifyTriadicRecurrence();
      expect(result.valid).toBe(true);
      expect(result.pairs).toHaveLength(3);
    });

    it('Sys1 should mirror Sys4 and vice versa', () => {
      const sys1 = getSystemDefinition(1);
      const sys4 = getSystemDefinition(4);
      expect(sys1.triadicMirror).toBe(4);
      expect(sys4.triadicMirror).toBe(1);
    });

    it('Sys2 should mirror Sys5 and vice versa', () => {
      const sys2 = getSystemDefinition(2);
      const sys5 = getSystemDefinition(5);
      expect(sys2.triadicMirror).toBe(5);
      expect(sys5.triadicMirror).toBe(2);
    });

    it('Sys3 should mirror Sys6 and vice versa', () => {
      const sys3 = getSystemDefinition(3);
      const sys6 = getSystemDefinition(6);
      expect(sys3.triadicMirror).toBe(6);
      expect(sys6.triadicMirror).toBe(3);
    });
  });

  // ============================================================
  // CNS Centre Naming Convention
  // ============================================================

  describe('CNS-mapped centre naming', () => {
    it('Sys1: C₁ = Idea (undifferentiated)', () => {
      const def = getSystemDefinition(1);
      expect(def.centres[0].name).toBe('Idea');
    });

    it('Sys2: C₁ = Idea, C₂ = Form', () => {
      const def = getSystemDefinition(2);
      expect(def.centres[0].name).toBe('Idea');
      expect(def.centres[1].name).toBe('Form');
    });

    it('Sys3: C₁ = Idea, C₂ = Knowledge (undifferentiated), C₃ = Form', () => {
      const def = getSystemDefinition(3);
      expect(def.centres[0].name).toBe('Idea');
      expect(def.centres[1].name).toBe('Knowledge');
      expect(def.centres[2].name).toBe('Form');
    });

    it('Sys4: C₁ = Idea, C₂ = Knowledge, C₃ = Routine, C₄ = Form', () => {
      const def = getSystemDefinition(4);
      expect(def.centres[0].name).toBe('Idea');
      expect(def.centres[1].name).toBe('Knowledge');
      expect(def.centres[2].name).toBe('Routine');
      expect(def.centres[3].name).toBe('Form');
    });

    it('Sys5: C₁ = Idea, C₂ = Somatic, C₃ = Autonomic, C₄ = Routine, C₅ = Form', () => {
      const def = getSystemDefinition(5);
      expect(def.centres[0].name).toBe('Idea');
      expect(def.centres[1].name).toBe('Somatic');
      expect(def.centres[2].name).toBe('Autonomic');
      expect(def.centres[3].name).toBe('Routine');
      expect(def.centres[4].name).toBe('Form');
    });

    it('Sys5 should NOT have Cerebral centre', () => {
      const def = getSystemDefinition(5);
      const hasCerebral = def.centres.some(c =>
        c.name.toLowerCase().includes('cerebral')
      );
      expect(hasCerebral).toBe(false);
    });

    it('Sys6: C₁ = Idea, C₂ = Cerebral, C₃ = Somatic, C₄ = Autonomic, C₅ = Routine, C₆ = Form', () => {
      const def = getSystemDefinition(6);
      expect(def.centres[0].name).toBe('Idea');
      expect(def.centres[1].name).toBe('Cerebral');
      expect(def.centres[2].name).toBe('Somatic');
      expect(def.centres[3].name).toBe('Autonomic');
      expect(def.centres[4].name).toBe('Routine');
      expect(def.centres[5].name).toBe('Form');
    });

    it('Sys6 Cerebral centre should mention neocortex ≥6 layers', () => {
      const def = getSystemDefinition(6);
      const cerebral = def.centres[1];
      expect(cerebral.role).toContain('≥6');
      expect(cerebral.role).toContain('neocortical');
    });

    it('knowledge centres should differentiate progressively', () => {
      // Sys3-4: single undifferentiated Knowledge
      const sys3 = getSystemDefinition(3);
      const sys4 = getSystemDefinition(4);
      expect(sys3.centres.filter(c => c.name === 'Knowledge')).toHaveLength(1);
      expect(sys4.centres.filter(c => c.name === 'Knowledge')).toHaveLength(1);

      // Sys5: splits into Somatic + Autonomic (2 knowledge centres)
      const sys5 = getSystemDefinition(5);
      const knowledgeCentres5 = sys5.centres.filter(c =>
        ['Somatic', 'Autonomic'].includes(c.name)
      );
      expect(knowledgeCentres5).toHaveLength(2);

      // Sys6: adds Cerebral (3 knowledge centres)
      const sys6 = getSystemDefinition(6);
      const knowledgeCentres6 = sys6.centres.filter(c =>
        ['Cerebral', 'Somatic', 'Autonomic'].includes(c.name)
      );
      expect(knowledgeCentres6).toHaveLength(3);
    });

    it('C₁ should always be Idea across all levels', () => {
      for (let n = 1; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        expect(def.centres[0].name).toBe('Idea');
      }
    });

    it('Cₙ should always be Form for N ≥ 2', () => {
      for (let n = 2; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        const lastCentre = def.centres[def.centres.length - 1];
        expect(lastCentre.name).toBe('Form');
      }
    });

    it('Cₙ₋₁ should be Routine for N ≥ 4', () => {
      for (let n = 4; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        const secondLast = def.centres[def.centres.length - 2];
        expect(secondLast.name).toBe('Routine');
      }
    });
  });

  // ============================================================
  // System Definitions Registry
  // ============================================================

  describe('system definitions registry', () => {
    it('getAllSystemDefinitions should return all 6 levels', () => {
      const all = getAllSystemDefinitions();
      expect(all.size).toBe(6);

      for (let n = 1; n <= 6; n++) {
        expect(all.has(n as SystemLevel)).toBe(true);
      }
    });

    it('each definition should have a principle', () => {
      for (let n = 1; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        expect(def.principle.length).toBeGreaterThan(10);
      }
    });

    it('each definition should have cycleSteps', () => {
      const expectedCycles = [1, 2, 12, 12, 60, 30];
      for (let n = 1; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        expect(def.cycleSteps).toBe(expectedCycles[n - 1]);
      }
    });

    it('each term should have valid mode (E or R)', () => {
      for (let n = 1; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        for (const term of def.terms) {
          expect(['E', 'R']).toContain(term.mode);
        }
      }
    });

    it('each term should have a parenthesis word string', () => {
      for (let n = 1; n <= 6; n++) {
        const def = getSystemDefinition(n as SystemLevel);
        for (const term of def.terms) {
          // Each term should have a non-empty parens string
          expect(term.parens.trim().length).toBeGreaterThan(0);
          // Should contain at least one pair of parentheses
          expect(term.parens).toContain('(');
          expect(term.parens).toContain(')');
        }
      }
    });

    it('Sys4 terms should follow 1/7 particular sequence naming', () => {
      const def = getSystemDefinition(4);
      expect(def.terms).toHaveLength(9);
      expect(def.terms[0].description).toContain('T1');
      expect(def.terms[8].description).toContain('T9');
    });
  });
});

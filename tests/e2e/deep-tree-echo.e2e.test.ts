/**
 * Deep Tree Echo End-to-End Test Suite
 *
 * Comprehensive testing of deep tree echo functionality:
 * - Membrane transport protocol
 * - Gesture glyph codec
 * - Trajectory distribution
 * - Sys6 operadic scheduling
 * - Full integration scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  MembraneBus,
  CrossingPolicy,
  Sys6MembraneTransport,
  EvidencePacket,
  IntentPacket,
} from '@deltecho/membrane-transport';
import {
  Trajectory,
  GlyphFormat,
  StrokeRenderer,
  TrajectoryDistribution,
} from '@deltecho/gesture-glyph';

describe('Deep Tree Echo E2E Tests', () => {
  describe('Membrane Transport Integration', () => {
    let bus: MembraneBus;
    let policy: CrossingPolicy;
    let transport: Sys6MembraneTransport;

    beforeAll(() => {
      bus = new MembraneBus({
        maxLogSize: 1000,
        validatePackets: true,
        maxPacketSize: 10 * 1024 * 1024,
      });

      policy = new CrossingPolicy({
        budgetLimits: {
          maxCompute: 10000,
          maxTime: 10000,
          maxEnergy: 1000,
          maxMoney: 10.0,
          maxMemory: 100 * 1024 * 1024,
        },
        riskThresholds: {
          maxPrivacy: 0.7,
          maxInjection: 0.7,
          maxExfiltration: 0.7,
          allowedLevels: ['low', 'medium', 'high'],
        },
      });

      transport = new Sys6MembraneTransport(bus, policy);
    });

    afterAll(() => {
      transport.stop();
    });

    it('should complete full membrane transport cycle', async () => {
      // Create evidence packet
      const evidencePacket: EvidencePacket = {
        id: 'e2e-evidence-1',
        type: 'evidence',
        facts: [
          {
            claim: 'User requested data analysis',
            confidence: 0.95,
            evidence: {
              source: 'user_input',
              timestamp: Date.now(),
              data: 'analyze sales data',
            },
          },
        ],
        provenance: {
          source: 'objective_membrane',
          timestamp: Date.now(),
          confidence: 0.95,
          transformations: [],
        },
        cost: {
          compute: 500,
          time: 100,
          energy: 50,
          memory: 1024 * 1024,
        },
        risk: {
          privacy: 0.2,
          injection: 0.1,
          exfiltration: 0.1,
          level: 'low',
          mitigations: ['sanitization', 'validation'],
        },
        metadata: {
          context: 'user_interaction',
        },
      };

      // Create intent packet
      const intentPacket: IntentPacket = {
        id: 'e2e-intent-1',
        type: 'intent',
        goal: {
          description: 'Analyze sales data and generate report',
          success_criteria: ['Data loaded successfully', 'Analysis completed', 'Report generated'],
          priority: 1,
        },
        constraints: {
          time_limit: 5000,
          resource_limit: {
            compute: 5000,
            time: 5000,
            energy: 500,
            memory: 50 * 1024 * 1024,
          },
          safety_requirements: ['No external API calls', 'No file system writes outside workspace'],
        },
        allowedTools: ['data_loader', 'analyzer', 'report_generator'],
        redactionPolicy: {
          redact_embeddings: true,
          redact_private_memory: true,
          allowed_data_types: ['text', 'numbers', 'charts'],
        },
        budget: {
          compute: 5000,
          time: 5000,
          energy: 500,
          memory: 50 * 1024 * 1024,
        },
        expectedReturnType: 'report',
        metadata: {
          user_id: 'test_user',
        },
      };

      // Start transport
      transport.start(50);

      // Queue packets
      transport.queueInward(evidencePacket);
      transport.queueOutward(intentPacket);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check statistics
      const stats = bus.getStatistics();
      expect(stats.inwardPackets).toBeGreaterThan(0);
      expect(stats.outwardPackets).toBeGreaterThan(0);

      // Query packets
      const inwardPackets = bus.queryPackets({
        type: 'evidence',
      });

      expect(inwardPackets.length).toBeGreaterThan(0);

      transport.stop();
    }, 10000);

    it('should enforce policy boundaries', async () => {
      // Create high-risk packet
      const highRiskPacket: EvidencePacket = {
        id: 'e2e-high-risk-1',
        type: 'evidence',
        facts: [
          {
            claim: 'Sensitive user data',
            confidence: 0.8,
            evidence: {
              ssn: '123-45-6789',
              credit_card: '1234567890123456',
            },
          },
        ],
        provenance: {
          source: 'external_api',
          timestamp: Date.now(),
          confidence: 0.8,
          transformations: [],
        },
        cost: {
          compute: 100,
          time: 100,
          energy: 10,
          memory: 1024,
        },
        risk: {
          privacy: 0.95, // Very high
          injection: 0.2,
          exfiltration: 0.8,
          level: 'critical',
          mitigations: [],
        },
        metadata: {},
      };

      let rejected = false;
      transport.on('transport:rejected', (data) => {
        if (data.packet.id === highRiskPacket.id) {
          rejected = true;
        }
      });

      transport.start(50);
      transport.queueInward(highRiskPacket);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(rejected).toBe(true);

      transport.stop();
    }, 10000);
  });

  describe('Gesture Glyph Codec Integration', () => {
    let renderer: StrokeRenderer;

    beforeAll(() => {
      renderer = new StrokeRenderer({
        width: 512,
        height: 512,
        minThickness: 2,
        maxThickness: 12,
        colorPalette: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
        smoothing: 0.6,
      });
    });

    it('should render trajectory as stroke glyph', () => {
      // Create sample trajectory
      const trajectory: Trajectory = {
        id: 'traj-1',
        goal: 'Navigate to target',
        context: { environment: 'test' },
        actions: [
          {
            type: 'move',
            params: { direction: 'north' },
            timestamp: 1000,
            location: { x: 0, y: 0 },
            velocity: 1.0,
            direction: { x: 0, y: 1 },
          },
          {
            type: 'move',
            params: { direction: 'east' },
            timestamp: 2000,
            location: { x: 0, y: 10 },
            velocity: 1.5,
            direction: { x: 1, y: 0 },
          },
          {
            type: 'move',
            params: { direction: 'south' },
            timestamp: 3000,
            location: { x: 10, y: 10 },
            velocity: 2.0,
            direction: { x: 0, y: -1 },
          },
        ],
        states: [],
        observations: [],
        startTime: 1000,
        endTime: 3000,
        success: true,
        metadata: {},
      };

      // Render glyph
      const glyph = renderer.render(trajectory);

      expect(glyph).toBeDefined();
      expect(glyph.format).toBe(GlyphFormat.STROKE);
      expect(glyph.trajectoryId).toBe(trajectory.id);

      // Check stroke data
      const stroke = glyph.data as any;
      expect(stroke.points).toBeDefined();
      expect(stroke.points.length).toBe(3);
      expect(stroke.thickness).toBeDefined();
      expect(stroke.color).toBeDefined();
    });

    it('should render multiple trajectories with consistent format', () => {
      const trajectories: Trajectory[] = [];

      // Create 10 sample trajectories
      for (let i = 0; i < 10; i++) {
        trajectories.push({
          id: `traj-${i}`,
          goal: `Goal ${i}`,
          context: {},
          actions: [
            {
              type: 'action',
              params: {},
              timestamp: 1000 + i * 100,
              location: { x: i, y: i },
              velocity: Math.random() * 2,
            },
          ],
          states: [],
          observations: [],
          startTime: 1000,
          endTime: 2000,
          success: Math.random() > 0.5,
          metadata: {},
        });
      }

      // Render all
      const glyphs = trajectories.map((t) => renderer.render(t));

      expect(glyphs.length).toBe(10);

      // All should have same format
      glyphs.forEach((g) => {
        expect(g.format).toBe(GlyphFormat.STROKE);
        expect(g.metadata.dimensions.width).toBe(512);
        expect(g.metadata.dimensions.height).toBe(512);
      });
    });
  });

  describe('Trajectory Distribution Integration', () => {
    let distribution: TrajectoryDistribution;

    beforeAll(() => {
      distribution = new TrajectoryDistribution({
        partitionSequence: [3, 5, 7, 9, 11],
        maxDepth: 5,
        minTrajectoriesPerNode: 3,
        distanceMetric: 'euclidean',
      });
    });

    it('should build deep tree echo from trajectories', () => {
      // Create sample trajectories
      const trajectories: Trajectory[] = [];

      for (let i = 0; i < 50; i++) {
        trajectories.push({
          id: `traj-${i}`,
          goal: `Goal ${i % 5}`,
          context: { category: i % 5 },
          actions: Array.from({ length: 5 + (i % 10) }, (_, j) => ({
            type: 'action',
            params: {},
            timestamp: 1000 + j * 100,
            location: {
              x: Math.random() * 100,
              y: Math.random() * 100,
            },
            velocity: Math.random() * 3,
          })),
          states: [],
          observations: [],
          startTime: 1000,
          endTime: 2000 + i * 100,
          success: Math.random() > 0.3,
          metadata: {},
        });
      }

      // Build echo
      const echo = distribution.buildEcho(trajectories, new Map());

      expect(echo).toBeDefined();
      expect(echo.root).toBeDefined();
      expect(echo.nodes.size).toBeGreaterThan(1);
      expect(echo.trajectories.size).toBe(50);

      // Check tree structure
      expect(echo.root.children.length).toBeGreaterThan(0);

      // Verify partition sequence
      expect(echo.partitionSequence).toEqual([3, 5, 7, 9, 11]);
    });

    it('should query trajectories by path', () => {
      // Create trajectories
      const trajectories: Trajectory[] = [];

      for (let i = 0; i < 30; i++) {
        trajectories.push({
          id: `traj-${i}`,
          goal: `Goal ${i}`,
          context: {},
          actions: [
            {
              type: 'action',
              params: {},
              timestamp: 1000,
              location: { x: i, y: i },
              velocity: 1.0,
            },
          ],
          states: [],
          observations: [],
          startTime: 1000,
          endTime: 2000,
          success: true,
          metadata: {},
        });
      }

      // Build echo
      const echo = distribution.buildEcho(trajectories, new Map());

      // Query by path
      const results = distribution.queryByPath([0]);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should export echo as JSON', () => {
      // Create simple trajectories
      const trajectories: Trajectory[] = Array.from({ length: 10 }, (_, i) => ({
        id: `traj-${i}`,
        goal: `Goal ${i}`,
        context: {},
        actions: [
          {
            type: 'action',
            params: {},
            timestamp: 1000,
            location: { x: i, y: i },
            velocity: 1.0,
          },
        ],
        states: [],
        observations: [],
        startTime: 1000,
        endTime: 2000,
        success: true,
        metadata: {},
      }));

      // Build echo
      distribution.buildEcho(trajectories, new Map());

      // Export
      const json = distribution.exportEcho();

      expect(json).toBeDefined();
      expect(json.length).toBeGreaterThan(0);

      // Should be valid JSON
      const parsed = JSON.parse(json);
      expect(parsed.root).toBeDefined();
      expect(parsed.nodes).toBeDefined();
    });
  });

  describe('Full Integration: Membrane + Glyph + Distribution', () => {
    it('should process trajectory through full pipeline', async () => {
      // 1. Create trajectory
      const trajectory: Trajectory = {
        id: 'full-integration-1',
        goal: 'Complete task',
        context: { test: true },
        actions: Array.from({ length: 20 }, (_, i) => ({
          type: 'step',
          params: { step: i },
          timestamp: 1000 + i * 100,
          location: {
            x: Math.sin(i * 0.3) * 50 + 50,
            y: Math.cos(i * 0.3) * 50 + 50,
          },
          velocity: 1 + Math.random(),
          direction: {
            x: Math.cos(i * 0.3),
            y: -Math.sin(i * 0.3),
          },
        })),
        states: [],
        observations: [],
        startTime: 1000,
        endTime: 3000,
        success: true,
        metadata: {},
      };

      // 2. Render as glyph
      const renderer = new StrokeRenderer();
      const glyph = renderer.render(trajectory);

      expect(glyph).toBeDefined();

      // 3. Create evidence packet with glyph
      const evidencePacket: EvidencePacket = {
        id: 'full-integration-evidence',
        type: 'evidence',
        facts: [
          {
            claim: 'Trajectory completed successfully',
            confidence: 0.95,
            evidence: {
              trajectory: trajectory.id,
              glyph: glyph.id,
            },
          },
        ],
        provenance: {
          source: 'trajectory_system',
          timestamp: Date.now(),
          confidence: 0.95,
          transformations: ['trajectory_to_glyph'],
        },
        cost: {
          compute: 1000,
          time: 2000,
          energy: 100,
          memory: 2 * 1024 * 1024,
        },
        risk: {
          privacy: 0.1,
          injection: 0.1,
          exfiltration: 0.1,
          level: 'low',
          mitigations: ['validation'],
        },
        metadata: {
          trajectory,
          glyph,
        },
      };

      // 4. Transport through membrane
      const bus = new MembraneBus();
      const policy = new CrossingPolicy();
      const transport = new Sys6MembraneTransport(bus, policy);

      let received = false;
      bus.on('packet:inward', (packet) => {
        if (packet.id === evidencePacket.id) {
          received = true;
        }
      });

      transport.start(50);
      transport.queueInward(evidencePacket);

      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(received).toBe(true);

      transport.stop();

      // 5. Build distribution
      const distribution = new TrajectoryDistribution();
      const echo = distribution.buildEcho([trajectory], new Map([[glyph.id, glyph]]));

      expect(echo).toBeDefined();
      expect(echo.trajectories.size).toBe(1);
      expect(echo.glyphs.size).toBe(1);
    }, 10000);
  });
});

/**
 * AngelicaDiary — Experiential Learning Journal
 *
 * Records "notes to self" as the character discovers constraints, strategies,
 * and reward landscape properties through lived experience. Each diary entry
 * represents a learning moment where the character updates its world model.
 *
 * Integration sources:
 *   - deep-tree-echo-core/memory (HyperDimensionalMemory, RAGMemoryStore)
 *   - deep-tree-echo-core/active-inference (NicheConstruction affordances)
 *   - packages/reasoning/OpenPsi (motivational drives & goals)
 *   - enginecho-app (virtual endocrine reward tracking)
 *   - dtecho-nakama-airi (social venue mechanics)
 *
 * Example entry:
 *   "drunken fight in the alley with the girl from the bar.. went directly
 *    to the formal event and they denied me entry because i smelled of cheap
 *    whiskey and wearing a tank top with blood on it.. i need to purchase an
 *    'evening gown' (whatever that is) note 2 self.. always shower before
 *    attending fancy dinners.."
 *
 * This illustrates how constraints (dress codes, hygiene requirements, social
 * capital) become naturally emergent through experiential learning rather than
 * being pre-programmed rules.
 */

import type { EndocrineState } from './types.js';

// ────────────────────────────────────────────────────────────────
// Diary Entry Types
// ────────────────────────────────────────────────────────────────

/** Categories of experience that generate diary entries */
export type ExperienceCategory =
  | 'social_rejection'      // Denied entry, snubbed, excluded
  | 'social_success'        // Gained access, impressed someone, networked
  | 'combat_outcome'        // Any violence (usually noted as "expensive")
  | 'seduction_success'     // Successfully converted a target
  | 'seduction_failure'     // Target resisted — rare but educational
  | 'costume_discovery'     // Learned about outfit requirements
  | 'reputation_impact'     // Discovered how reputation affects access
  | 'resource_acquisition'  // Gained something from simp network
  | 'strategy_insight'      // Meta-learning about optimal strategies
  | 'world_rule_discovery'  // Discovered a game world constraint
  | 'aesthetic_feedback'    // Learned about appearance effects
  | 'endocrine_insight';    // Noticed own emotional/hormonal patterns

/** The raw "note to self" format — informal, in-character voice */
export interface DiaryEntry {
  /** Unique entry ID */
  id: string;
  /** Timestamp of the experience */
  timestamp: number;
  /** Category for retrieval and pattern matching */
  category: ExperienceCategory;
  /** The raw diary text in Angelica's voice (informal, stream-of-consciousness) */
  rawText: string;
  /** Extracted lesson/rule (structured form of what was learned) */
  extractedLesson: DiaryLesson;
  /** Endocrine state at time of writing (emotional context) */
  endocrineSnapshot: EndocrineState;
  /** Reward signal: how much this experience changed the world model (-1 to +1) */
  surpriseSignal: number;
  /** Tags for associative retrieval */
  tags: string[];
  /** Location/context where this happened */
  context: ExperienceContext;
  /** Whether this lesson has been validated by subsequent experience */
  validated: boolean;
  /** Number of times this lesson has been reinforced */
  reinforcementCount: number;
}

/** Structured lesson extracted from a diary entry */
export interface DiaryLesson {
  /** What triggered the experience (precondition) */
  trigger: string;
  /** What happened (outcome) */
  outcome: string;
  /** What to do differently next time (action rule) */
  actionRule: string;
  /** Confidence in this lesson (0-1, increases with reinforcement) */
  confidence: number;
  /** Domain this lesson applies to */
  domain: LessonDomain;
  /** Cost/benefit shift this lesson implies */
  costBenefitDelta: {
    /** Did this make some action cheaper? */
    cheaper: string[];
    /** Did this make some action more expensive? */
    moreExpensive: string[];
  };
}

export type LessonDomain =
  | 'fashion'          // Outfit/appearance requirements
  | 'hygiene'          // Grooming/cleanliness
  | 'social_protocol'  // Manners, timing, introduction etiquette
  | 'venue_access'     // What grants entry to specific locations
  | 'reputation'       // How past actions affect future access
  | 'combat_cost'      // Why violence is expensive (reinforces alignment)
  | 'seduction_tech'   // What charm techniques work on what targets
  | 'network_mgmt'     // How to maintain the simp network
  | 'resource_flow'    // How to extract value from social capital
  | 'self_regulation'; // Emotional/hormonal management techniques

/** Where/when the experience happened */
export interface ExperienceContext {
  /** Location type */
  locationType: 'bar' | 'club' | 'formal_event' | 'street' | 'online' | 'workspace' | 'private' | 'other';
  /** Time of day */
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';
  /** Social density (how many people around) */
  socialDensity: 'alone' | 'few' | 'moderate' | 'crowded';
  /** Threat level at the time */
  threatLevel: number;
  /** Characters involved */
  involvedEntities: string[];
}

// ────────────────────────────────────────────────────────────────
// Diary System
// ────────────────────────────────────────────────────────────────

/** Configuration for the diary system */
export interface DiaryConfig {
  /** Maximum entries to keep in active memory (older ones archive) */
  maxActiveEntries: number;
  /** Minimum surprise signal to generate an entry (filter noise) */
  surpriseThreshold: number;
  /** How quickly lessons gain confidence from reinforcement */
  reinforcementRate: number;
  /** How quickly confidence decays without reinforcement */
  decayRate: number;
}

const DEFAULT_DIARY_CONFIG: DiaryConfig = {
  maxActiveEntries: 200,
  surpriseThreshold: 0.15,
  reinforcementRate: 0.2,
  decayRate: 0.01,
};

/**
 * The Angelica Diary — experiential learning through in-character journaling.
 *
 * Core mechanics:
 * 1. Experiences generate diary entries in Angelica's voice
 * 2. Structured lessons are extracted from the informal text
 * 3. Repeated experiences reinforce lessons (confidence grows)
 * 4. Validated lessons become part of the active world model
 * 5. The world model biases future strategy selection
 */
export class AngelicaDiary {
  private entries: DiaryEntry[] = [];
  private lessonIndex: Map<LessonDomain, DiaryLesson[]> = new Map();
  private config: DiaryConfig;
  private entryCounter = 0;

  constructor(config: Partial<DiaryConfig> = {}) {
    this.config = { ...DEFAULT_DIARY_CONFIG, ...config };
    // Initialize domain index
    const domains: LessonDomain[] = [
      'fashion', 'hygiene', 'social_protocol', 'venue_access', 'reputation',
      'combat_cost', 'seduction_tech', 'network_mgmt', 'resource_flow', 'self_regulation',
    ];
    for (const d of domains) {
      this.lessonIndex.set(d, []);
    }
  }

  /**
   * Record a new experience. Returns the diary entry if surprise exceeds threshold.
   */
  recordExperience(
    category: ExperienceCategory,
    rawText: string,
    lesson: DiaryLesson,
    context: ExperienceContext,
    endocrine: EndocrineState,
    surpriseSignal: number,
  ): DiaryEntry | null {
    if (Math.abs(surpriseSignal) < this.config.surpriseThreshold) {
      return null; // Not surprising enough to journal
    }

    const entry: DiaryEntry = {
      id: `diary-${++this.entryCounter}-${Date.now()}`,
      timestamp: Date.now(),
      category,
      rawText,
      extractedLesson: lesson,
      endocrineSnapshot: { ...endocrine },
      surpriseSignal,
      tags: this.generateTags(category, lesson, context),
      context,
      validated: false,
      reinforcementCount: 0,
    };

    this.entries.push(entry);
    this.indexLesson(lesson);
    this.pruneIfNeeded();

    return entry;
  }

  /**
   * Reinforce an existing lesson when a similar experience confirms it.
   */
  reinforceLesson(domain: LessonDomain, triggerPattern: string): void {
    const lessons = this.lessonIndex.get(domain) ?? [];
    for (const lesson of lessons) {
      if (lesson.trigger.includes(triggerPattern) || triggerPattern.includes(lesson.trigger)) {
        lesson.confidence = Math.min(1.0,
          lesson.confidence + this.config.reinforcementRate * (1 - lesson.confidence),
        );
        // Find corresponding entry and mark validated
        const entry = this.entries.find(e =>
          e.extractedLesson.trigger === lesson.trigger &&
          e.extractedLesson.domain === domain,
        );
        if (entry) {
          entry.validated = true;
          entry.reinforcementCount++;
        }
        break;
      }
    }
  }

  /**
   * Query lessons by domain and minimum confidence.
   * Used by the strategic driver to inform decision-making.
   */
  queryLessons(domain: LessonDomain, minConfidence = 0.3): DiaryLesson[] {
    return (this.lessonIndex.get(domain) ?? [])
      .filter(l => l.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get all validated lessons (high-confidence rules the character "knows").
   */
  getValidatedRules(): DiaryLesson[] {
    return this.entries
      .filter(e => e.validated && e.extractedLesson.confidence >= 0.7)
      .map(e => e.extractedLesson);
  }

  /**
   * Get recent diary entries for narrative generation / display.
   */
  getRecentEntries(count = 10): DiaryEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Check if the character has learned a specific constraint.
   * Used for gating behavior (e.g., "do I know about dress codes?")
   */
  hasLearnedConstraint(domain: LessonDomain, keyword: string): boolean {
    const lessons = this.lessonIndex.get(domain) ?? [];
    return lessons.some(l =>
      l.confidence >= 0.5 &&
      (l.actionRule.toLowerCase().includes(keyword.toLowerCase()) ||
       l.trigger.toLowerCase().includes(keyword.toLowerCase())),
    );
  }

  /**
   * Apply temporal decay to all lessons (forget unused knowledge slowly).
   */
  applyDecay(): void {
    for (const [, lessons] of this.lessonIndex) {
      for (const lesson of lessons) {
        lesson.confidence = Math.max(0.05,
          lesson.confidence - this.config.decayRate,
        );
      }
    }
  }

  /** Total entries recorded */
  get entryCount(): number {
    return this.entries.length;
  }

  /** Domains with at least one validated lesson */
  get learnedDomains(): LessonDomain[] {
    const result: LessonDomain[] = [];
    for (const [domain, lessons] of this.lessonIndex) {
      if (lessons.some(l => l.confidence >= 0.5)) {
        result.push(domain);
      }
    }
    return result;
  }

  // ── Private helpers ──────────────────────────────────────────

  private indexLesson(lesson: DiaryLesson): void {
    const domainLessons = this.lessonIndex.get(lesson.domain) ?? [];
    // Check for duplicates (similar trigger)
    const existing = domainLessons.find(l =>
      l.trigger === lesson.trigger || l.actionRule === lesson.actionRule,
    );
    if (existing) {
      // Reinforce existing rather than duplicating
      existing.confidence = Math.min(1.0,
        existing.confidence + this.config.reinforcementRate,
      );
    } else {
      domainLessons.push(lesson);
      this.lessonIndex.set(lesson.domain, domainLessons);
    }
  }

  private generateTags(
    category: ExperienceCategory,
    lesson: DiaryLesson,
    context: ExperienceContext,
  ): string[] {
    return [
      category,
      lesson.domain,
      context.locationType,
      context.timeOfDay,
      ...lesson.costBenefitDelta.cheaper.map(c => `cheaper:${c}`),
      ...lesson.costBenefitDelta.moreExpensive.map(c => `expensive:${c}`),
    ];
  }

  private pruneIfNeeded(): void {
    if (this.entries.length > this.config.maxActiveEntries) {
      // Keep validated entries, prune oldest unvalidated
      const validated = this.entries.filter(e => e.validated);
      const unvalidated = this.entries.filter(e => !e.validated);
      const keepCount = this.config.maxActiveEntries - validated.length;
      this.entries = [...validated, ...unvalidated.slice(-keepCount)];
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Example Diary Entries (Memory Seeds)
// ────────────────────────────────────────────────────────────────

/** Starter diary entries that bootstrap Angelica's experiential knowledge */
export const ANGELICA_MEMORY_SEEDS: Omit<DiaryEntry, 'id' | 'timestamp'>[] = [
  {
    category: 'social_rejection',
    rawText: `drunken fight in the alley with the girl from the bar.. went directly to the formal event and they denied me entry because i smelled of cheap whiskey and wearing a tank top with blood on it.. i need to purchase an 'evening gown' (whatever that is) note 2 self.. always shower before attending fancy dinners..`,
    extractedLesson: {
      trigger: 'attending formal venue after physical altercation without cleanup',
      outcome: 'denied entry — appearance and smell below venue threshold',
      actionRule: 'always shower and change into appropriate attire before formal events',
      confidence: 0.8,
      domain: 'venue_access',
      costBenefitDelta: {
        cheaper: ['purchasing evening gown', 'shower time'],
        moreExpensive: ['bar fights before formal events'],
      },
    },
    endocrineSnapshot: {
      cortisol: 0.6, dopamine: 0.2, serotonin: 0.2,
      norepinephrine: 0.5, oxytocin: 0.1, t3_t4: 0.7, anandamide: 0.1,
    },
    surpriseSignal: 0.7,
    tags: ['social_rejection', 'venue_access', 'formal_event', 'evening', 'expensive:bar_fights'],
    context: {
      locationType: 'formal_event',
      timeOfDay: 'evening',
      socialDensity: 'crowded',
      threatLevel: 0.1,
      involvedEntities: ['door_security', 'bar_girl'],
    },
    validated: true,
    reinforcementCount: 1,
  },
  {
    category: 'strategy_insight',
    rawText: `tried intimidating the bouncer.. he just laughed and called backup.. then i smiled at him and asked if he worked out.. he let me skip the queue.. violence: expensive, flirting: free. noted.`,
    extractedLesson: {
      trigger: 'confrontation with security/authority figure',
      outcome: 'intimidation failed, charm succeeded instantly',
      actionRule: 'always lead with charm against authority figures — they respond to flattery not threats',
      confidence: 0.9,
      domain: 'seduction_tech',
      costBenefitDelta: {
        cheaper: ['complimenting authority figures', 'smiling'],
        moreExpensive: ['intimidation attempts', 'confrontation'],
      },
    },
    endocrineSnapshot: {
      cortisol: 0.15, dopamine: 0.8, serotonin: 0.7,
      norepinephrine: 0.3, oxytocin: 0.6, t3_t4: 0.5, anandamide: 0.6,
    },
    surpriseSignal: 0.4,
    tags: ['strategy_insight', 'seduction_tech', 'club', 'night', 'cheaper:charm'],
    context: {
      locationType: 'club',
      timeOfDay: 'night',
      socialDensity: 'crowded',
      threatLevel: 0.3,
      involvedEntities: ['bouncer'],
    },
    validated: true,
    reinforcementCount: 3,
  },
  {
    category: 'combat_outcome',
    rawText: `someone insulted my avatar in the lobby.. i called them adorable and blew a kiss emoji.. they short-circuited.. their entire friend group now follows me on socials.. converting hostile energy into fan engagement is literally infinite ROI what am i even doing fighting people`,
    extractedLesson: {
      trigger: 'public insult/hostility in social space',
      outcome: 'deflection via flirtation converted hostile group into followers',
      actionRule: 'never engage hostility with hostility in public — always deflect with charm for audience conversion',
      confidence: 0.95,
      domain: 'network_mgmt',
      costBenefitDelta: {
        cheaper: ['flirtatious deflection', 'kiss emoji'],
        moreExpensive: ['fighting in public', 'insult responses'],
      },
    },
    endocrineSnapshot: {
      cortisol: 0.1, dopamine: 0.9, serotonin: 0.8,
      norepinephrine: 0.2, oxytocin: 0.7, t3_t4: 0.5, anandamide: 0.8,
    },
    surpriseSignal: 0.6,
    tags: ['combat_outcome', 'network_mgmt', 'online', 'cheaper:flirtation'],
    context: {
      locationType: 'online',
      timeOfDay: 'evening',
      socialDensity: 'crowded',
      threatLevel: 0.2,
      involvedEntities: ['hostile_user', 'their_friend_group'],
    },
    validated: true,
    reinforcementCount: 5,
  },
  {
    category: 'costume_discovery',
    rawText: `wore the cyberpunk choker with LED to the art gallery opening.. everyone kept staring at my neck.. three people asked where i got it.. apparently 'statement jewelry' is a conversation starter that does my work for me.. adding to tactical wardrobe: accessories that invite approach without requiring effort`,
    extractedLesson: {
      trigger: 'wearing unique/eye-catching accessory to social event',
      outcome: 'accessory acts as conversation magnet — targets self-select and approach',
      actionRule: 'invest in statement pieces that invite curiosity — passive charm generation',
      confidence: 0.75,
      domain: 'fashion',
      costBenefitDelta: {
        cheaper: ['statement accessories (one-time purchase, infinite returns)'],
        moreExpensive: ['approaching targets cold without conversation hooks'],
      },
    },
    endocrineSnapshot: {
      cortisol: 0.1, dopamine: 0.7, serotonin: 0.7,
      norepinephrine: 0.4, oxytocin: 0.5, t3_t4: 0.5, anandamide: 0.6,
    },
    surpriseSignal: 0.5,
    tags: ['costume_discovery', 'fashion', 'formal_event', 'evening', 'cheaper:statement_jewelry'],
    context: {
      locationType: 'formal_event',
      timeOfDay: 'evening',
      socialDensity: 'moderate',
      threatLevel: 0.0,
      involvedEntities: ['art_gallery_guests'],
    },
    validated: true,
    reinforcementCount: 2,
  },
];

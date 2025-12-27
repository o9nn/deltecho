/**
 * Test fixtures for cognitive system testing
 */

export const sampleConversations = [
  {
    name: 'greeting',
    messages: [
      { role: 'user' as const, content: 'Hello!' },
      { role: 'assistant' as const, content: 'Hello! How can I help you today?' },
    ],
  },
  {
    name: 'question-answer',
    messages: [
      { role: 'user' as const, content: 'What is the capital of France?' },
      { role: 'assistant' as const, content: 'The capital of France is Paris.' },
    ],
  },
  {
    name: 'multi-turn',
    messages: [
      { role: 'user' as const, content: 'Tell me about cats.' },
      {
        role: 'assistant' as const,
        content: 'Cats are domesticated felines known for their independence and agility.',
      },
      { role: 'user' as const, content: 'Are they good pets?' },
      {
        role: 'assistant' as const,
        content: 'Yes, cats make excellent pets. They are relatively low-maintenance and provide companionship.',
      },
    ],
  },
];

export const samplePersonalities = [
  {
    name: 'helpful',
    traits: ['helpful', 'patient', 'knowledgeable'],
    mood: 'positive',
    style: 'professional',
  },
  {
    name: 'curious',
    traits: ['curious', 'inquisitive', 'thoughtful'],
    mood: 'neutral',
    style: 'casual',
  },
  {
    name: 'creative',
    traits: ['creative', 'imaginative', 'expressive'],
    mood: 'enthusiastic',
    style: 'playful',
  },
];

export const sampleMemories = [
  {
    type: 'episodic',
    content: 'User asked about machine learning on 2024-01-15',
    timestamp: Date.now() - 86400000 * 7,
    importance: 0.7,
  },
  {
    type: 'semantic',
    content: 'Machine learning is a subset of AI that enables systems to learn from data',
    timestamp: Date.now() - 86400000 * 30,
    importance: 0.9,
  },
  {
    type: 'procedural',
    content: 'When user greets, respond warmly and ask how to help',
    timestamp: Date.now() - 86400000 * 60,
    importance: 0.8,
  },
];

export const sampleEmotionalStates = [
  { valence: 0.8, arousal: 0.3, dominance: 0.6, label: 'content' },
  { valence: -0.5, arousal: 0.7, dominance: 0.3, label: 'anxious' },
  { valence: 0.9, arousal: 0.8, dominance: 0.7, label: 'excited' },
  { valence: 0.0, arousal: 0.2, dominance: 0.5, label: 'neutral' },
  { valence: -0.7, arousal: 0.2, dominance: 0.2, label: 'sad' },
];

export const sampleGoals = [
  {
    id: 'goal-1',
    description: 'Help user understand the topic',
    priority: 0.9,
    status: 'active',
  },
  {
    id: 'goal-2',
    description: 'Maintain engaging conversation',
    priority: 0.7,
    status: 'active',
  },
  {
    id: 'goal-3',
    description: 'Provide accurate information',
    priority: 0.95,
    status: 'active',
  },
];

export const sampleAttentionPatterns = [
  { focus: 'user-intent', weight: 0.8, duration: 5000 },
  { focus: 'context-retrieval', weight: 0.6, duration: 2000 },
  { focus: 'response-generation', weight: 0.9, duration: 3000 },
];

export const sampleKnowledgeNodes = [
  {
    type: 'ConceptNode' as const,
    name: 'artificial_intelligence',
    truthValue: { strength: 1.0, confidence: 1.0 },
  },
  {
    type: 'ConceptNode' as const,
    name: 'machine_learning',
    truthValue: { strength: 1.0, confidence: 1.0 },
  },
  {
    type: 'ConceptNode' as const,
    name: 'deep_learning',
    truthValue: { strength: 1.0, confidence: 1.0 },
  },
  {
    type: 'PredicateNode' as const,
    name: 'is_subset_of',
    truthValue: { strength: 1.0, confidence: 1.0 },
  },
];

export const sampleInferenceChains = [
  {
    name: 'taxonomic_reasoning',
    premises: [
      { type: 'InheritanceLink', from: 'cat', to: 'mammal' },
      { type: 'InheritanceLink', from: 'mammal', to: 'animal' },
    ],
    conclusion: { type: 'InheritanceLink', from: 'cat', to: 'animal' },
    rule: 'deduction',
  },
  {
    name: 'similarity_transfer',
    premises: [
      { type: 'SimilarityLink', from: 'cat', to: 'dog' },
      { type: 'InheritanceLink', from: 'dog', to: 'pet' },
    ],
    conclusion: { type: 'InheritanceLink', from: 'cat', to: 'pet' },
    rule: 'similarity',
  },
];

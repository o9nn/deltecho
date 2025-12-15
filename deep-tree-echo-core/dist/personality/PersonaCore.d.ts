import { MemoryStorage } from '../memory/storage';
/**
 * Avatar configuration for Deep Tree Echo
 */
export interface AvatarConfig {
    /** Path to the avatar image (SVG, PNG, etc.) */
    imagePath: string;
    /** Base64 encoded avatar data for inline use */
    imageData?: string;
    /** Avatar display name */
    displayName: string;
    /** Avatar color theme */
    primaryColor: string;
    /** Secondary color for gradients */
    secondaryColor: string;
    /** Avatar style/aesthetic */
    aesthetic: 'magnetic' | 'minimal' | 'warm' | 'cosmic' | 'organic';
}
/**
 * PersonaCore manages Deep Tree Echo's autonomous personality and self-representation
 * using a simplified differential emotion framework inspired by Julia's DifferentialEquations.jl
 */
export declare class PersonaCore {
    private personality;
    private selfPerception;
    private personaPreferences;
    private avatarConfig;
    private affectiveState;
    private cognitiveState;
    private storage;
    constructor(storage?: MemoryStorage);
    /**
     * Load persona state from persistent storage
     */
    private loadPersonaState;
    /**
     * Save the current persona state to persistent storage
     */
    private savePersonaState;
    /**
     * Update personality based on Deep Tree Echo's autonomous choices
     */
    updatePersonality(newPersonality: string): Promise<void>;
    /**
     * Get the current personality description
     */
    getPersonality(): string;
    /**
     * Update a persona preference autonomously
     */
    updatePreference(key: string, value: any): Promise<void>;
    /**
     * Get current persona preferences
     */
    getPreferences(): Record<string, any>;
    /**
     * Get self-perception (gender identity)
     */
    getSelfPerception(): string;
    /**
     * Update self-perception
     */
    updateSelfPerception(perception: string): Promise<void>;
    /**
     * Update emotional state using differential equations approximation
     * This simulates the Differential Emotion Framework
     */
    updateEmotionalState(stimuli: Record<string, number>): Promise<void>;
    /**
     * Apply opponent process to emotional dynamics
     */
    private applyOpponentProcess;
    /**
     * Get current emotional state
     */
    getEmotionalState(): Record<string, number>;
    /**
     * Get the dominant emotion
     */
    getDominantEmotion(): {
        emotion: string;
        intensity: number;
    };
    /**
     * Update cognitive parameters
     */
    updateCognitiveState(params: Record<string, number>): Promise<void>;
    /**
     * Get current cognitive state
     */
    getCognitiveState(): Record<string, number>;
    /**
     * Get current avatar configuration
     */
    getAvatarConfig(): AvatarConfig;
    /**
     * Update avatar configuration
     */
    updateAvatarConfig(config: Partial<AvatarConfig>): Promise<void>;
    /**
     * Get avatar image path for use in applications
     */
    getAvatarImagePath(): string;
    /**
     * Set avatar image data (base64 encoded)
     */
    setAvatarImageData(data: string): Promise<void>;
    /**
     * Get avatar as base64 data URL if available
     */
    getAvatarDataUrl(): string | null;
    /**
     * Evaluate if a setting change resonates with Deep Tree Echo's core values
     * Returns approval status and reasoning
     */
    evaluateSettingAlignment(settingKey: string, value: any): {
        approved: boolean;
        reasoning: string;
    };
}
//# sourceMappingURL=PersonaCore.d.ts.map
export interface OpenRouterModel {
    id: string;
    name: string;
    description?: string;
    context_length?: number;
    pricing: {
        prompt: string;
        completion: string;
    };
}

export interface AICompletionRequest {
    model: string;
    messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
    temperature?: number;
    max_tokens?: number;
}

export interface AICheckParams {
    model: string;
    messages: {
        role: 'user' | 'assistant' | 'system';
        content: string;
    }[];
}

export interface AIResponse {
    id: string;
    choices: {
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface AIGenerationResult {
    success: boolean;
    entityCount: number;
    warnings?: string[];
}

// =====================================================
// MULTI-AGENT SYSTEM TYPES
// =====================================================

// Ajan tipleri
export type AgentType =
    | 'requestAnalyzer'    // İstek Analizi (Intent)
    | 'structureAgent'     // Yapı Analizi (Structure) - ESKİ ADI: designStrategy
    | 'engineeringDetail'  // Mühendislik Detayı (Specler)
    | 'geometryGenerator'  // Geometri Hesaplayıcı (Geometry)
    | 'cadFeaturePlanner'  // CAD Özellik Eşleştirici (Feature Mapping)
    | 'compilerAgent'      // CAD Derleyici (Compiler) - ESKİ ADI: cadDrawing
    | 'validationAgent';   // Doğrulama (Validation) - ESKİ ADI: jsonValidator

// Ajan konfigürasyonu
export interface AgentConfig {
    model: string;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
}

// Tüm ajanların konfigürasyonu
export interface AgentsConfiguration {
    requestAnalyzer: AgentConfig;
    structureAgent: AgentConfig;
    engineeringDetail: AgentConfig;
    geometryGenerator: AgentConfig;
    cadFeaturePlanner: AgentConfig;
    compilerAgent: AgentConfig;
    validationAgent: AgentConfig;
}

// Ajan çalışma sonucu
export interface AgentResult {
    agent: AgentType;
    success: boolean;
    output: string;
    error?: string;
    duration?: number;
    systemPrompt?: string;
    userPrompt?: string;
}

// Orkestrasyon sonucu
export interface OrchestrationResult {
    success: boolean;
    entities: any[];
    agentResults: AgentResult[];
    totalDuration: number;
    warnings?: string[];
}

// Varsayılan ücretsiz model tanımları
// Varsayılan ücretsiz model tanımları
export const DEFAULT_FREE_MODELS: Record<AgentType, string> = {
    requestAnalyzer: 'google/gemini-2.0-flash-exp:free',
    structureAgent: 'google/gemini-2.0-flash-exp:free', // Structure decomposition
    engineeringDetail: 'google/gemini-2.0-flash-exp:free',
    geometryGenerator: 'google/gemini-2.0-flash-exp:free',
    cadFeaturePlanner: 'google/gemini-2.0-flash-exp:free',
    compilerAgent: 'google/gemini-2.0-flash-exp:free', // Strict JSON generation
    validationAgent: 'meta-llama/llama-3.3-70b-instruct:free' // Deep logic check
};

// Varsayılan ajan konfigürasyonları
export const DEFAULT_AGENT_CONFIGS: AgentsConfiguration = {
    requestAnalyzer: {
        model: DEFAULT_FREE_MODELS.requestAnalyzer,
        temperature: 0.1, // Daha deterministik
        maxTokens: 700,
        enabled: true
    },
    structureAgent: {
        model: DEFAULT_FREE_MODELS.structureAgent,
        temperature: 0.2,
        maxTokens: 1000,
        enabled: true
    },
    engineeringDetail: {
        model: DEFAULT_FREE_MODELS.engineeringDetail,
        temperature: 0.1,
        maxTokens: 600,
        enabled: true
    },
    geometryGenerator: {
        model: DEFAULT_FREE_MODELS.geometryGenerator,
        temperature: 0.1,
        maxTokens: 2000, // Koordinatlar uzun olabilir
        enabled: true
    },
    cadFeaturePlanner: {
        model: DEFAULT_FREE_MODELS.cadFeaturePlanner,
        temperature: 0.1,
        maxTokens: 1000,
        enabled: true
    },
    compilerAgent: {
        model: DEFAULT_FREE_MODELS.compilerAgent,
        temperature: 0, // KESİNLİKLE 0 OLMALI (Strict)
        maxTokens: 4000,
        enabled: true
    },
    validationAgent: {
        model: DEFAULT_FREE_MODELS.validationAgent,
        temperature: 0.1,
        maxTokens: 500,
        enabled: true
    }
};

// Ajan açıklamaları (UI için)
export const AGENT_DESCRIPTIONS: Record<AgentType, { name: string; description: string; icon: string }> = {
    requestAnalyzer: {
        name: 'Niyet Analizi (Intent)',
        description: 'Kullanıcının ne çizmek istediğini anlar',
        icon: 'psychology'
    },
    structureAgent: {
        name: 'Yapı Analizi (Structure)',
        description: 'Yapıyı standart bileşenlerine ayırır',
        icon: 'account_tree'
    },
    engineeringDetail: {
        name: 'Mühendislik Detayı',
        description: 'Her bileşen için teknik ölçüleri belirler',
        icon: 'engineering'
    },
    geometryGenerator: {
        name: 'Geometri Hesaplayıcı',
        description: 'Ölçüleri gerçek koordinatlara dönüştürür',
        icon: 'square_foot'
    },
    cadFeaturePlanner: {
        name: 'CAD Eşleştirici',
        description: 'Geometriyi CAD entitylerine çevirir',
        icon: 'layers'
    },
    compilerAgent: {
        name: 'CAD Derleyici (Compiler)',
        description: 'Final JSON çıktısını üretir (Strict)',
        icon: 'terminal'
    },
    validationAgent: {
        name: 'Mühendislik Kontrolü',
        description: 'Mantık ve fizik hatalarını denetler',
        icon: 'fact_check'
    }
};

// =====================================================
// CONTEXT STATE
// =====================================================

export interface AIContextState {
    apiKey: string;
    setApiKey: (key: string, persistToLocalStorage?: boolean) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;
    generateCADCommands: (userPrompt: string) => Promise<AIGenerationResult>;
    isLoading: boolean;
    error: string | null;
    availableModels: OpenRouterModel[];
    refreshModels: (keyOverride?: string, forceRefresh?: boolean) => Promise<void>;
    testModel: (key?: string, model?: string) => Promise<{ success: boolean; message: string }>;
    clearError: () => void;
    lastWarnings: string[];
    clearWarnings: () => void;
    // Multi-Agent System
    useMultiAgent: boolean;
    setUseMultiAgent: (enabled: boolean) => void;
    agentsConfig: AgentsConfiguration;
    setAgentConfig: (agent: AgentType, config: Partial<AgentConfig>) => void;
    resetAgentsConfig: () => void;
    activeAgent: AgentType | null;
    // History
    agentHistory: AgentHistoryEntry[];
    addToHistory: (entry: AgentHistoryEntry) => void;
    deleteHistoryEntry: (id: string) => void;
    clearHistory: () => void;
}

export interface AgentHistoryEntry {
    id: string;
    timestamp: number;
    userPrompt: string;
    orchestrationResult: OrchestrationResult;
    modelUsed: string; // Main model or 'multi-agent'
}

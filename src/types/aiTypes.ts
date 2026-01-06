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
    | 'requestAnalyzer'    // İstek Analizi
    | 'designStrategy'     // Tasarım Stratejisi
    | 'engineeringDetail'  // Mühendislik Detayı
    | 'cadFeaturePlanner'  // CAD Özellik Planlama
    | 'cadDrawing'         // CAD Çizim (JSON üretici)
    | 'jsonValidator';     // JSON Doğrulayıcı

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
    designStrategy: AgentConfig;
    engineeringDetail: AgentConfig;
    cadFeaturePlanner: AgentConfig;
    cadDrawing: AgentConfig;
    jsonValidator: AgentConfig;
}

// Ajan çalışma sonucu
export interface AgentResult {
    agent: AgentType;
    success: boolean;
    output: string;
    error?: string;
    duration?: number;
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
    requestAnalyzer: 'google/gemini-2.0-flash-exp:free', // 1M Context
    designStrategy: 'google/gemini-2.0-flash-exp:free', // 1M Context
    engineeringDetail: 'google/gemini-2.0-flash-exp:free', // 1M Context
    cadFeaturePlanner: 'google/gemini-2.0-flash-exp:free', // 1M Context
    cadDrawing: 'google/gemini-2.0-flash-exp:free', // 1M Context (Tüm geçmişi tutar)
    jsonValidator: 'meta-llama/llama-3.3-70b-instruct:free' // Strong validation
};

// Varsayılan ajan konfigürasyonları
export const DEFAULT_AGENT_CONFIGS: AgentsConfiguration = {
    requestAnalyzer: {
        model: DEFAULT_FREE_MODELS.requestAnalyzer,
        temperature: 0.3,
        maxTokens: 700,
        enabled: true
    },
    designStrategy: {
        model: DEFAULT_FREE_MODELS.designStrategy,
        temperature: 0.35,
        maxTokens: 700,
        enabled: true
    },
    engineeringDetail: {
        model: DEFAULT_FREE_MODELS.engineeringDetail,
        temperature: 0.15,
        maxTokens: 600,
        enabled: true
    },
    cadFeaturePlanner: {
        model: DEFAULT_FREE_MODELS.cadFeaturePlanner,
        temperature: 0.2,
        maxTokens: 500,
        enabled: true
    },
    cadDrawing: {
        model: DEFAULT_FREE_MODELS.cadDrawing,
        temperature: 0,
        maxTokens: 1800,
        enabled: true
    },
    jsonValidator: {
        model: DEFAULT_FREE_MODELS.jsonValidator,
        temperature: 0,
        maxTokens: 400,
        enabled: true
    }
};

// Ajan açıklamaları (UI için)
export const AGENT_DESCRIPTIONS: Record<AgentType, { name: string; description: string; icon: string }> = {
    requestAnalyzer: {
        name: 'İstek Analizi',
        description: 'Kullanıcı komutunu analiz eder ve sınıflandırır',
        icon: 'psychology'
    },
    designStrategy: {
        name: 'Tasarım Stratejisi',
        description: 'Hangi çizimlerin üretileceğini planlar',
        icon: 'architecture'
    },
    engineeringDetail: {
        name: 'Mühendislik Detayı',
        description: 'Ölçüler ve teknik kararları belirler',
        icon: 'engineering'
    },
    cadFeaturePlanner: {
        name: 'CAD Özellik Planlama',
        description: 'Entity ve layer eşleştirmesi yapar',
        icon: 'layers'
    },
    cadDrawing: {
        name: 'CAD Çizim',
        description: 'JSON formatında CAD verisi üretir',
        icon: 'draw'
    },
    jsonValidator: {
        name: 'JSON Doğrulayıcı',
        description: 'Çıktının geçerliliğini kontrol eder',
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
    clearHistory: () => void;
}

export interface AgentHistoryEntry {
    id: string;
    timestamp: number;
    userPrompt: string;
    orchestrationResult: OrchestrationResult;
    modelUsed: string; // Main model or 'multi-agent'
}

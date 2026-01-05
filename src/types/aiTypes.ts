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

export interface AIContextState {
    apiKey: string;
    setApiKey: (key: string) => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    systemPrompt: string;
    setSystemPrompt: (prompt: string) => void;
    generateCADCommands: (userPrompt: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    availableModels: OpenRouterModel[];
    refreshModels: (keyOverride?: string) => Promise<void>;
    testModel: (key?: string, model?: string) => Promise<{ success: boolean; message: string }>;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OpenRouterService } from '../services/OpenRouterService';
import {
    OpenRouterModel,
    AIContextState,
    AgentType,
    AgentConfig,
    AgentsConfiguration,
    DEFAULT_AGENT_CONFIGS,
    AgentHistoryEntry
} from '../types/aiTypes';
import { useDrawing } from './DrawingContext';

const AIContext = createContext<AIContextState | null>(null);

export const useAI = () => {
    const context = useContext(AIContext);
    if (!context) {
        throw new Error('useAI must be used within AIProvider');
    }
    return context;
};

interface AIProviderProps {
    children: React.ReactNode;
}

const STORAGE_KEY_API = 'cad_ai_api_key';
const STORAGE_KEY_MODEL = 'cad_ai_model';
const STORAGE_KEY_PROMPT = 'cad_ai_system_prompt';
const STORAGE_KEY_MODELS_CACHE = 'cad_ai_models_cache';
const STORAGE_KEY_USE_MULTI_AGENT = 'cad_ai_use_multi_agent';
const STORAGE_KEY_AGENTS_CONFIG = 'cad_ai_agents_config';
const STORAGE_KEY_HISTORY = 'cad_ai_agent_history';
const MODELS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat cache geçerlilik süresi

// Basit şifreleme/çözme (XOR tabanlı) - production'da daha güçlü bir yöntem kullanılmalı
const OBFUSCATION_KEY = 'cad_ai_k3y_0bfusc4t10n';
const obfuscateApiKey = (key: string): string => {
    if (!key) return '';
    try {
        const result = key.split('').map((char, i) =>
            String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length))
        ).join('');
        return btoa(result); // Base64 encode
    } catch {
        return '';
    }
};

const deobfuscateApiKey = (encoded: string): string => {
    if (!encoded) return '';
    try {
        const decoded = atob(encoded); // Base64 decode
        return decoded.split('').map((char, i) =>
            String.fromCharCode(char.charCodeAt(0) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length))
        ).join('');
    } catch {
        return '';
    }
};

// Storage yardımcı fonksiyonları
const getStoredApiKey = (): string => {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY_API) || localStorage.getItem(STORAGE_KEY_API);
        if (!stored) return '';
        // Eski format kontrolü (düz metin mi?)
        if (stored.startsWith('sk-') || stored.startsWith('pk-')) {
            return stored; // Migration için eski formatı kabul et
        }
        return deobfuscateApiKey(stored);
    } catch {
        return '';
    }
};

const setStoredApiKey = (key: string, useSession: boolean = false): void => {
    const obfuscated = obfuscateApiKey(key);
    if (useSession) {
        sessionStorage.setItem(STORAGE_KEY_API, obfuscated);
        localStorage.removeItem(STORAGE_KEY_API); // sessionStorage kullanıyorsak localStorage'dan sil
    } else {
        localStorage.setItem(STORAGE_KEY_API, obfuscated);
    }
};

// Cache yardımcı fonksiyonları
interface ModelsCacheData {
    models: OpenRouterModel[];
    timestamp: number;
}

const getModelsCacheData = (): OpenRouterModel[] => {
    try {
        const cached = localStorage.getItem(STORAGE_KEY_MODELS_CACHE);
        if (!cached) return [];
        const data: ModelsCacheData = JSON.parse(cached);
        // Cache süresi kontrolü
        if (Date.now() - data.timestamp > MODELS_CACHE_TTL) {
            localStorage.removeItem(STORAGE_KEY_MODELS_CACHE);
            return [];
        }
        return data.models || [];
    } catch {
        return [];
    }
};

const setModelsCacheData = (models: OpenRouterModel[]): void => {
    const data: ModelsCacheData = {
        models,
        timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_MODELS_CACHE, JSON.stringify(data));
};

// Agents config storage fonksiyonları
const getStoredAgentsConfig = (): AgentsConfiguration => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_AGENTS_CONFIG);
        if (!stored) return DEFAULT_AGENT_CONFIGS;

        const parsed = JSON.parse(stored);

        // Merge with defaults to ensure all new keys exist
        // This handles migration from old config structures automatically
        return {
            ...DEFAULT_AGENT_CONFIGS,
            ...parsed,
            // Ensure all keys from DEFAULT are definitely present even if parsed has them missing
            // (Deep merge might be better but top-level agent keys are enough here)
            requestAnalyzer: { ...DEFAULT_AGENT_CONFIGS.requestAnalyzer, ...parsed.requestAnalyzer },
            structureAgent: { ...DEFAULT_AGENT_CONFIGS.structureAgent, ...(parsed.structureAgent || parsed.designStrategy) }, // Migration
            engineeringDetail: { ...DEFAULT_AGENT_CONFIGS.engineeringDetail, ...parsed.engineeringDetail },
            geometryGenerator: { ...DEFAULT_AGENT_CONFIGS.geometryGenerator, ...parsed.geometryGenerator },
            cadFeaturePlanner: { ...DEFAULT_AGENT_CONFIGS.cadFeaturePlanner, ...parsed.cadFeaturePlanner },
            compilerAgent: { ...DEFAULT_AGENT_CONFIGS.compilerAgent, ...(parsed.compilerAgent || parsed.cadDrawing) }, // Migration
            validationAgent: { ...DEFAULT_AGENT_CONFIGS.validationAgent, ...(parsed.validationAgent || parsed.jsonValidator) } // Migration
        };
    } catch {
        return DEFAULT_AGENT_CONFIGS;
    }
};

const setStoredAgentsConfig = (config: AgentsConfiguration): void => {
    localStorage.setItem(STORAGE_KEY_AGENTS_CONFIG, JSON.stringify(config));
};

const getStoredUseMultiAgent = (): boolean => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_USE_MULTI_AGENT);
        return stored === 'true';
    } catch {
        return false;
    }
};

const getStoredHistory = (): AgentHistoryEntry[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
    const [apiKey, setApiKeyState] = useState<string>(() => getStoredApiKey());
    const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem(STORAGE_KEY_MODEL) || 'openai/gpt-3.5-turbo');
    const [systemPrompt, setSystemPromptState] = useState<string>(() => localStorage.getItem(STORAGE_KEY_PROMPT) || '');
    const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>(() => getModelsCacheData());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastWarnings, setLastWarnings] = useState<string[]>([]);

    // Multi-Agent State
    const [useMultiAgent, setUseMultiAgentState] = useState<boolean>(() => getStoredUseMultiAgent());
    const [agentsConfig, setAgentsConfigState] = useState<AgentsConfiguration>(() => getStoredAgentsConfig());
    const [activeAgent, setActiveAgent] = useState<AgentType | null>(null);

    // History State
    const [agentHistory, setAgentHistory] = useState<AgentHistoryEntry[]>(() => getStoredHistory());

    const { addEntity } = useDrawing();

    const service = React.useMemo(() => new OpenRouterService(apiKey), [apiKey]);

    const setApiKey = (key: string, persistToLocalStorage: boolean = true) => {
        setApiKeyState(key);
        setStoredApiKey(key, !persistToLocalStorage);
    };

    const setSelectedModelWrapper = (model: string) => {
        setSelectedModel(model);
        localStorage.setItem(STORAGE_KEY_MODEL, model);
    };

    const setSystemPrompt = (prompt: string) => {
        setSystemPromptState(prompt);
        localStorage.setItem(STORAGE_KEY_PROMPT, prompt);
    };

    // Multi-Agent setters
    const setUseMultiAgent = (enabled: boolean) => {
        setUseMultiAgentState(enabled);
        localStorage.setItem(STORAGE_KEY_USE_MULTI_AGENT, enabled ? 'true' : 'false');
    };

    const setAgentConfig = (agent: AgentType, config: Partial<AgentConfig>) => {
        setAgentsConfigState(prev => {
            const updated = {
                ...prev,
                [agent]: { ...prev[agent], ...config }
            };
            setStoredAgentsConfig(updated);
            return updated;
        });
    };

    const resetAgentsConfig = () => {
        setAgentsConfigState(DEFAULT_AGENT_CONFIGS);
        setStoredAgentsConfig(DEFAULT_AGENT_CONFIGS);
    };

    const addToHistory = (entry: AgentHistoryEntry) => {
        setAgentHistory(prev => {
            const updated = [entry, ...prev].slice(0, 50); // Keep last 50 entries
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
            return updated;
        });
    };

    const clearHistory = () => {
        setAgentHistory([]);
        localStorage.removeItem(STORAGE_KEY_HISTORY);
    };

    const deleteHistoryEntry = (id: string) => {
        setAgentHistory(prev => {
            const updated = prev.filter(entry => entry.id !== id);
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
            return updated;
        });
    };

    const refreshModels = useCallback(async (keyOverride?: string, forceRefresh: boolean = false) => {
        const keyToUse = keyOverride || apiKey;
        if (!keyToUse) {
            setError('Model listesi için API anahtarı gerekli');
            return;
        }

        // Cache kontrolü (force refresh değilse)
        if (!forceRefresh && availableModels.length > 0) {
            const cachedModels = getModelsCacheData();
            if (cachedModels.length > 0) {
                setAvailableModels(cachedModels);
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        try {
            const tempService = keyOverride ? new OpenRouterService(keyOverride) : service;
            const models = await tempService.getModels();

            if (models.length === 0) {
                console.warn('API modeller döndürmedi');
            }

            setAvailableModels(models);
            setModelsCacheData(models);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
            console.error('Model yükleme hatası:', err);
            setError(`Model listesi yüklenemedi: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, service, availableModels.length]);

    useEffect(() => {
        if (apiKey && availableModels.length === 0) {
            refreshModels();
        }
    }, [apiKey, refreshModels, availableModels.length]);

    const generateCADCommands = async (userPrompt: string): Promise<{ success: boolean; entityCount: number; warnings?: string[] }> => {
        if (!userPrompt || userPrompt.trim().length === 0) {
            setError('Çizim komutu boş olamaz');
            return { success: false, entityCount: 0 };
        }

        if (!apiKey) {
            setError('AI kullanmak için API anahtarı gerekli. Ayarlar > AI sekmesinden ekleyin.');
            return { success: false, entityCount: 0 };
        }

        if (!selectedModel && !useMultiAgent) {
            setError('Lütfen bir AI modeli seçin');
            return { success: false, entityCount: 0 };
        }

        setIsLoading(true);
        setError(null);
        setLastWarnings([]);

        try {
            let result: { entities: any[]; warnings?: string[] };

            if (useMultiAgent) {
                // Multi-Agent Pipeline
                console.log('🔄 Multi-Agent modu aktif');
                const orchestrationResult = await service.runOrchestration(
                    userPrompt,
                    agentsConfig,
                    (agent) => setActiveAgent(agent as AgentType | null)
                );
                result = {
                    entities: orchestrationResult.entities,
                    warnings: orchestrationResult.warnings
                };

                // Add to history
                addToHistory({
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    userPrompt,
                    orchestrationResult,
                    modelUsed: 'Multi-Agent'
                });

                // Log agent results for debugging
                orchestrationResult.agentResults.forEach(ar => {
                    console.log(`[${ar.agent}] ${ar.success ? '✅' : '❌'} (${ar.duration}ms)`);
                });
            } else {
                // Tek model modu (mevcut davranış)
                result = await service.generateCompletion(userPrompt, selectedModel, systemPrompt);

                // Convert single model result to pseudo-orchestration result for history
                const orchestrationResult = {
                    success: true,
                    entities: result.entities,
                    agentResults: [{
                        agent: 'cadDrawing' as AgentType,
                        success: true,
                        output: JSON.stringify(result.entities),
                        duration: 0
                    }],
                    totalDuration: 0,
                    warnings: result.warnings
                };

                // Add to history
                addToHistory({
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    userPrompt,
                    orchestrationResult,
                    modelUsed: selectedModel
                });
            }

            if (!result || !result.entities || !Array.isArray(result.entities)) {
                setError('AI geçerli bir çizim yanıtı döndürmedi');
                return { success: false, entityCount: 0 };
            }

            // Warnings varsa kaydet
            if (result.warnings && result.warnings.length > 0) {
                setLastWarnings(result.warnings);
                console.warn('AI entity uyarıları:', result.warnings);
            }

            // Entity'leri çizime ekle
            let addedCount = 0;
            for (const entity of result.entities) {
                try {
                    addEntity(entity);
                    addedCount++;
                } catch (entityErr) {
                    console.error('Entity ekleme hatası:', entityErr, entity);
                }
            }

            if (addedCount === 0 && result.entities.length > 0) {
                setError('Hiçbir entity çizime eklenemedi. Lütfen farklı bir komut deneyin.');
                return { success: false, entityCount: 0 };
            }

            return {
                success: true,
                entityCount: addedCount,
                warnings: result.warnings
            };

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'AI işlemi sırasında bir hata oluştu';
            setError(errorMessage);
            console.error('AI generation hatası:', err);
            return { success: false, entityCount: 0 };
        } finally {
            setIsLoading(false);
        }
    };

    const testModel = async (keyOverride?: string, modelOverride?: string): Promise<{ success: boolean; message: string }> => {
        const keyToUse = keyOverride || apiKey;
        const modelToUse = modelOverride || selectedModel;

        if (!keyToUse) return { success: false, message: 'API Key eksik' };
        if (!modelToUse) return { success: false, message: 'Model seçili değil' };

        setIsLoading(true);
        setError(null);
        try {
            const tempService = keyOverride ? new OpenRouterService(keyOverride) : service;
            const response = await tempService.testModel(modelToUse);
            return { success: true, message: response };
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu';
            console.error('Model test hatası:', err);
            return { success: false, message: errorMessage };
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);
    const clearWarnings = () => setLastWarnings([]);

    const value: AIContextState = {
        apiKey,
        setApiKey,
        selectedModel,
        setSelectedModel: setSelectedModelWrapper,
        systemPrompt,
        setSystemPrompt,
        generateCADCommands,
        isLoading,
        error,
        availableModels,
        refreshModels,
        testModel,
        clearError,
        lastWarnings,
        clearWarnings,
        // Multi-Agent
        useMultiAgent,
        setUseMultiAgent,
        agentsConfig,
        setAgentConfig,
        resetAgentsConfig,
        activeAgent,
        agentHistory,
        addToHistory,
        deleteHistoryEntry,
        clearHistory
    };

    return (
        <AIContext.Provider value={value}>
            {children}
        </AIContext.Provider>
    );
};


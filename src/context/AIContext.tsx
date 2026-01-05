import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OpenRouterService } from '../services/OpenRouterService';
import { OpenRouterModel, AIContextState } from '../types/aiTypes';
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

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
    const [apiKey, setApiKeyState] = useState<string>(() => localStorage.getItem(STORAGE_KEY_API) || '');
    const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem(STORAGE_KEY_MODEL) || 'openai/gpt-3.5-turbo');
    const [systemPrompt, setSystemPromptState] = useState<string>(() => localStorage.getItem(STORAGE_KEY_PROMPT) || '');
    const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>(() => {
        try {
            const cached = localStorage.getItem(STORAGE_KEY_MODELS_CACHE);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { addEntity } = useDrawing();

    const service = React.useMemo(() => new OpenRouterService(apiKey), [apiKey]);

    const setApiKey = (key: string) => {
        setApiKeyState(key);
        localStorage.setItem(STORAGE_KEY_API, key);
    };

    const setSelectedModelWrapper = (model: string) => {
        setSelectedModel(model);
        localStorage.setItem(STORAGE_KEY_MODEL, model);
    };

    const setSystemPrompt = (prompt: string) => {
        setSystemPromptState(prompt);
        localStorage.setItem(STORAGE_KEY_PROMPT, prompt);
    };

    const refreshModels = useCallback(async (keyOverride?: string) => {
        const keyToUse = keyOverride || apiKey;
        if (!keyToUse) return;

        // Re-initialize service if key is different (though service memozation depends on apiKey state, 
        // for immediate check we might need a temp service or just trust the fetch logic isn't tied effectively to instance yet if we change logic)
        // Actually, OpenRouterService takes key in constructor. 
        // If we want to use a NEW key before state update, we must instantiate a temp service or update the service.
        // Let's create a temp service instance if keyOverride is provided.

        setIsLoading(true);
        setError(null); // Clear previous errors
        try {
            const tempService = keyOverride ? new OpenRouterService(keyOverride) : service;
            const models = await tempService.getModels();
            setAvailableModels(models);
            localStorage.setItem(STORAGE_KEY_MODELS_CACHE, JSON.stringify(models));
        } catch (err: any) {
            console.error('Failed to load models', err);
            setError(`Failed to refresh models: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, service]);

    useEffect(() => {
        if (apiKey && availableModels.length === 0) {
            refreshModels();
        }
    }, [apiKey, refreshModels, availableModels.length]);

    const generateCADCommands = async (userPrompt: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await service.generateCompletion(userPrompt, selectedModel, systemPrompt);

            if (result && result.entities && Array.isArray(result.entities)) {
                // Add entities to the drawing
                result.entities.forEach((entity: any) => {
                    // Basic validation/sanitization could happen here
                    addEntity(entity);
                });
            } else {
                console.warn("AI response did not contain expected 'entities' array:", result);
                // Determine if we should show an error or just a warning if it just chatted back
            }

        } catch (err: any) {
            setError(err.message || 'An error occurred during AI generation');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const testModel = async (keyOverride?: string, modelOverride?: string) => {
        const keyToUse = keyOverride || apiKey;
        const modelToUse = modelOverride || selectedModel;

        if (!keyToUse) return { success: false, message: 'API Key eksik' };
        if (!modelToUse) return { success: false, message: 'Model seçili değil' };

        setIsLoading(true);
        try {
            const tempService = keyOverride ? new OpenRouterService(keyOverride) : service;
            const response = await tempService.testModel(modelToUse);
            return { success: true, message: response };
        } catch (err: any) {
            console.error('Model test failed', err);
            return { success: false, message: err.message || 'Bilinmeyen bir hata oluştu' };
        } finally {
            setIsLoading(false);
        }
    };

    const clearError = () => setError(null);

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
        clearError
    };

    return (
        <AIContext.Provider value={value}>
            {children}
        </AIContext.Provider>
    );
};

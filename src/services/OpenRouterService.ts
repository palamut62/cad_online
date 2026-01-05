import { OpenRouterModel, AIResponse, AICompletionRequest } from '../types/aiTypes';

const BASE_URL = 'https://openrouter.ai/api/v1';

export class OpenRouterService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async handleResponseError(response: Response) {
        const status = response.status;
        let errorMessage = `API Hatası (${status})`;

        try {
            const errorData = await response.json();
            if (errorData.error) {
                if (status === 429) {
                    errorMessage = "AI servisi şu an yoğun (Hız sınırı aşıldı). Lütfen birkaç saniye sonra tekrar deneyin veya kendi API anahtarınızı ekleyin.";
                } else if (errorData.error.message) {
                    errorMessage = errorData.error.message;
                }
            }
        } catch (e) {
            const text = await response.text().catch(() => "");
            if (text) errorMessage += `: ${text}`;
        }

        throw new Error(errorMessage);
    }

    async getModels(): Promise<OpenRouterModel[]> {
        if (!this.apiKey) return [];

        try {
            const response = await fetch(`${BASE_URL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                await this.handleResponseError(response);
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    }

    async generateCompletion(prompt: string, model: string, systemPrompt?: string): Promise<any> {
        if (!this.apiKey) throw new Error('API Key is missing');

        const finalSystemPrompt = systemPrompt || `You are an expert CAD assistant.
Your goal is to interpret natural language requests and convert them into a JSON structure that represents CAD entities.
Output ONLY valid JSON. Do not include markdown formatting like \`\`\`json.

Supported Entity Types and structures:
1. LINE: { "type": "LINE", "start": [x, y, z], "end": [x, y, z], "layer": "0", "color": "BYLAYER" }
2. CIRCLE: { "type": "CIRCLE", "center": [x, y, z], "radius": number, "layer": "0", "color": "BYLAYER" }
3. RECTANGLE: { "type": "LWPOLYLINE", "vertices": [[x,y], [x,y], [x,y], [x,y]], "closed": true, "layer": "0" } -> Generate 4 corners
4. TEXT: { "type": "TEXT", "position": [x, y, z], "text": "string", "height": 10, "layer": "0" }
5. DIMENSION: { "type": "DIMENSION", "start": [x, y, z], "end": [x, y, z], "textPoint": [x, y, z] }

Example Response for "Draw a line from 0,0 to 100,100":
{
  "entities": [
    { "type": "LINE", "start": [0, 0, 0], "end": [100, 100, 0] }
  ]
}

If the user asks for a complex shape (like a room or title block), break it down into these primitives.
Coordinate system: X is right, Y is up.
`;

        const request: AICompletionRequest = {
            model: model,
            messages: [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2 // Low temperature for deterministic code/json generation
        };

        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'http://localhost:3000', // Update with actual domain if deployed
                    'X-Title': 'CAD Online AI',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                await this.handleResponseError(response);
            }

            const data: AIResponse = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('No content received from AI');
            }

            // Remove markdown format if present
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(cleanContent);

        } catch (error) {
            console.error('Error generating completion:', error);
            throw error;
        }
    }

    async testModel(model: string): Promise<string> {
        if (!this.apiKey) throw new Error('API Key is missing');

        const request: AICompletionRequest = {
            model: model,
            messages: [
                { role: 'user', content: 'Say "CAD Test Successful" if you can hear me. Keep it short.' }
            ],
            max_tokens: 20
        };

        const response = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'CAD Online AI',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            await this.handleResponseError(response);
        }

        const data: AIResponse = await response.json();
        return data.choices[0]?.message?.content || 'Success (No content)';
    }
}

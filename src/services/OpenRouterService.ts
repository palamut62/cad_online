import { OpenRouterModel, AIResponse, AICompletionRequest, AgentsConfiguration, OrchestrationResult } from '../types/aiTypes';

const BASE_URL = 'https://openrouter.ai/api/v1';

// Retry konfigürasyonu
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // 1 saniye
    maxDelay: 10000, // 10 saniye
    backoffMultiplier: 2,
};

// Rate limit durumu
interface RateLimitState {
    isLimited: boolean;
    retryAfter: number;
    lastRequest: number;
}

const rateLimitState: RateLimitState = {
    isLimited: false,
    retryAfter: 0,
    lastRequest: 0,
};

// Dinamik referer URL'i - production veya localhost
const getRefererUrl = (): string => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'http://localhost:3000';
};

// Global Context Definition


// Delay fonksiyonu
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff hesaplama
const calculateBackoff = (attempt: number): number => {
    const backoff = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
    // Jitter ekle (rastgele 0-500ms)
    const jitter = Math.random() * 500;
    return Math.min(backoff + jitter, RETRY_CONFIG.maxDelay);
};

// Desteklenen entity tipleri
const SUPPORTED_ENTITY_TYPES = ['LINE', 'CIRCLE', 'LWPOLYLINE', 'TEXT', 'DIMENSION', 'ARC', 'POLYLINE', 'POINT', 'ELLIPSE', 'SPLINE', 'HATCH', 'SOLID', 'INSERT', 'MTEXT', 'LEADER', 'BLOCK', 'DONUT', 'TABLE', 'RAY', 'XLINE'];

// Entity validation fonksiyonu
export const validateEntity = (entity: any): { valid: boolean; error?: string; sanitized?: any } => {
    if (!entity || typeof entity !== 'object') {
        return { valid: false, error: 'Entity bir nesne olmalı' };
    }

    if (!entity.type || typeof entity.type !== 'string') {
        return { valid: false, error: 'Entity type alanı eksik veya geçersiz' };
    }

    const entityType = entity.type.toUpperCase();
    if (!SUPPORTED_ENTITY_TYPES.includes(entityType)) {
        return { valid: false, error: `Desteklenmeyen entity tipi: ${entityType}` };
    }

    // Koordinat doğrulama fonksiyonu
    const isValidCoord = (coord: any): boolean => {
        if (!Array.isArray(coord)) return false;
        if (coord.length < 2 || coord.length > 3) return false;
        return coord.every((v: any) => typeof v === 'number' && isFinite(v));
    };

    // Koordinatı normalize et (z eksik ise ekle)
    const normalizeCoord = (coord: any): [number, number, number] => {
        if (Array.isArray(coord) && coord.length >= 2) {
            return [coord[0], coord[1], coord[2] || 0];
        }
        return [0, 0, 0];
    };

    // Tip bazlı doğrulama ve sanitization
    let sanitized: any = {
        ...entity,
        type: entityType,
        layer: entity.layer || '0',
        color: entity.color || 'BYLAYER'
    };

    switch (entityType) {
        case 'LINE':
            if (!isValidCoord(entity.start)) return { valid: false, error: 'LINE: start koordinatı geçersiz' };
            if (!isValidCoord(entity.end)) return { valid: false, error: 'LINE: end koordinatı geçersiz' };
            sanitized.start = normalizeCoord(entity.start);
            sanitized.end = normalizeCoord(entity.end);
            break;

        case 'CIRCLE':
            if (!isValidCoord(entity.center)) return { valid: false, error: 'CIRCLE: center koordinatı geçersiz' };
            if (typeof entity.radius !== 'number' || entity.radius <= 0) return { valid: false, error: 'CIRCLE: radius pozitif sayı olmalı' };
            sanitized.center = normalizeCoord(entity.center);
            break;

        case 'ARC':
            if (!isValidCoord(entity.center)) return { valid: false, error: 'ARC: center koordinatı geçersiz' };
            if (typeof entity.radius !== 'number' || entity.radius <= 0) return { valid: false, error: 'ARC: radius pozitif sayı olmalı' };
            sanitized.center = normalizeCoord(entity.center);
            // Açıları kontrol et ve varsayılan ata
            sanitized.startAngle = typeof entity.startAngle === 'number' ? entity.startAngle : 0;
            sanitized.endAngle = typeof entity.endAngle === 'number' ? entity.endAngle : Math.PI;
            break;

        case 'LWPOLYLINE':
        case 'POLYLINE':
            if (!Array.isArray(entity.vertices) || entity.vertices.length < 2) {
                return { valid: false, error: 'POLYLINE: en az 2 vertex gerekli' };
            }
            const validVertices: [number, number, number][] = [];
            for (const v of entity.vertices) {
                if (!isValidCoord(v)) return { valid: false, error: 'POLYLINE: geçersiz vertex koordinatı' };
                validVertices.push(normalizeCoord(v));
            }
            sanitized.type = 'LWPOLYLINE';
            sanitized.vertices = validVertices;
            sanitized.closed = entity.closed === true;
            break;

        case 'ELLIPSE':
            if (!isValidCoord(entity.center)) return { valid: false, error: 'ELLIPSE: center koordinatı geçersiz' };
            sanitized.center = normalizeCoord(entity.center);
            sanitized.rx = typeof entity.rx === 'number' && entity.rx > 0 ? entity.rx : 50;
            sanitized.ry = typeof entity.ry === 'number' && entity.ry > 0 ? entity.ry : 30;
            sanitized.rotation = typeof entity.rotation === 'number' ? entity.rotation : 0;
            break;

        case 'POINT':
            if (!isValidCoord(entity.position)) return { valid: false, error: 'POINT: position koordinatı geçersiz' };
            sanitized.position = normalizeCoord(entity.position);
            break;

        case 'SPLINE':
            const points = entity.controlPoints || entity.fitPoints || [];
            if (!Array.isArray(points) || points.length < 2) {
                return { valid: false, error: 'SPLINE: en az 2 kontrol noktası gerekli' };
            }
            const validPoints: [number, number, number][] = [];
            for (const p of points) {
                if (!isValidCoord(p)) return { valid: false, error: 'SPLINE: geçersiz kontrol noktası' };
                validPoints.push(normalizeCoord(p));
            }
            sanitized.controlPoints = validPoints;
            sanitized.degree = typeof entity.degree === 'number' ? entity.degree : 3;
            sanitized.closed = entity.closed === true;
            break;

        case 'DONUT':
            if (!isValidCoord(entity.center)) return { valid: false, error: 'DONUT: center koordinatı geçersiz' };
            sanitized.center = normalizeCoord(entity.center);
            sanitized.innerRadius = typeof entity.innerRadius === 'number' && entity.innerRadius >= 0 ? entity.innerRadius : 10;
            sanitized.outerRadius = typeof entity.outerRadius === 'number' && entity.outerRadius > 0 ? entity.outerRadius : 20;
            if (sanitized.innerRadius >= sanitized.outerRadius) {
                sanitized.innerRadius = sanitized.outerRadius * 0.5;
            }
            break;

        case 'TEXT':
            if (!isValidCoord(entity.position)) return { valid: false, error: 'TEXT: position koordinatı geçersiz' };
            if (typeof entity.text !== 'string' || entity.text.trim() === '') {
                sanitized.text = 'Metin';
            }
            sanitized.position = normalizeCoord(entity.position);
            sanitized.height = typeof entity.height === 'number' && entity.height > 0 ? entity.height : 5;
            sanitized.rotation = typeof entity.rotation === 'number' ? entity.rotation : 0;
            sanitized.justification = entity.justification || 'left';
            break;

        case 'MTEXT':
            if (!isValidCoord(entity.position)) return { valid: false, error: 'MTEXT: position koordinatı geçersiz' };
            if (typeof entity.text !== 'string' || entity.text.trim() === '') {
                sanitized.text = 'Metin';
            }
            sanitized.position = normalizeCoord(entity.position);
            sanitized.height = typeof entity.height === 'number' && entity.height > 0 ? entity.height : 5;
            sanitized.width = typeof entity.width === 'number' && entity.width > 0 ? entity.width : 100;
            sanitized.rotation = typeof entity.rotation === 'number' ? entity.rotation : 0;
            break;

        case 'DIMENSION':
            if (!isValidCoord(entity.start)) return { valid: false, error: 'DIMENSION: start koordinatı geçersiz' };
            if (!isValidCoord(entity.end)) return { valid: false, error: 'DIMENSION: end koordinatı geçersiz' };
            sanitized.start = normalizeCoord(entity.start);
            sanitized.end = normalizeCoord(entity.end);
            sanitized.dimType = entity.dimType || 'DIMLINEAR';
            if (entity.dimLinePosition && isValidCoord(entity.dimLinePosition)) {
                sanitized.dimLinePosition = normalizeCoord(entity.dimLinePosition);
            } else {
                // Varsayılan dimLinePosition hesapla
                const midX = (sanitized.start[0] + sanitized.end[0]) / 2;
                const midY = (sanitized.start[1] + sanitized.end[1]) / 2;
                sanitized.dimLinePosition = [midX, midY + 20, 0];
            }
            if (entity.center && isValidCoord(entity.center)) {
                sanitized.center = normalizeCoord(entity.center);
            }
            sanitized.textHeight = typeof entity.textHeight === 'number' ? entity.textHeight : 3;
            break;

        case 'HATCH':
            // Boundary kontrolü
            if (entity.boundary) {
                if (entity.boundary.vertices && Array.isArray(entity.boundary.vertices)) {
                    const boundaryVerts: [number, number, number][] = [];
                    for (const v of entity.boundary.vertices) {
                        if (isValidCoord(v)) {
                            boundaryVerts.push(normalizeCoord(v));
                        }
                    }
                    if (boundaryVerts.length < 3) {
                        return { valid: false, error: 'HATCH: boundary en az 3 vertex içermeli' };
                    }
                    sanitized.boundary = {
                        vertices: boundaryVerts,
                        closed: true
                    };
                } else if (Array.isArray(entity.boundary)) {
                    // Doğrudan vertex array
                    const boundaryVerts: [number, number, number][] = [];
                    for (const v of entity.boundary) {
                        if (isValidCoord(v)) {
                            boundaryVerts.push(normalizeCoord(v));
                        }
                    }
                    if (boundaryVerts.length < 3) {
                        return { valid: false, error: 'HATCH: boundary en az 3 vertex içermeli' };
                    }
                    sanitized.boundary = {
                        vertices: boundaryVerts,
                        closed: true
                    };
                } else {
                    return { valid: false, error: 'HATCH: boundary geçersiz format' };
                }
            } else {
                return { valid: false, error: 'HATCH: boundary alanı eksik' };
            }
            sanitized.pattern = entity.pattern || 'SOLID';
            sanitized.scale = typeof entity.scale === 'number' ? entity.scale : 1;
            sanitized.rotation = typeof entity.rotation === 'number' ? entity.rotation : 0;
            break;

        case 'TABLE':
            if (!isValidCoord(entity.position)) return { valid: false, error: 'TABLE: position koordinatı geçersiz' };
            sanitized.position = normalizeCoord(entity.position);
            sanitized.rows = typeof entity.rows === 'number' && entity.rows > 0 ? Math.floor(entity.rows) : 3;
            sanitized.cols = typeof entity.cols === 'number' && entity.cols > 0 ? Math.floor(entity.cols) : 3;
            sanitized.rowHeight = typeof entity.rowHeight === 'number' && entity.rowHeight > 0 ? entity.rowHeight : 10;
            sanitized.colWidth = typeof entity.colWidth === 'number' && entity.colWidth > 0 ? entity.colWidth : 30;
            sanitized.cellData = Array.isArray(entity.cellData) ? entity.cellData : [];
            sanitized.headerRow = entity.headerRow === true;
            break;

        case 'RAY':
        case 'XLINE':
            if (!isValidCoord(entity.origin)) return { valid: false, error: `${entityType}: origin koordinatı geçersiz` };
            if (!isValidCoord(entity.direction)) return { valid: false, error: `${entityType}: direction koordinatı geçersiz` };
            sanitized.origin = normalizeCoord(entity.origin);
            sanitized.direction = normalizeCoord(entity.direction);
            break;

        case 'LEADER':
            // Leader için basit validation
            if (entity.points && Array.isArray(entity.points)) {
                const leaderPoints: [number, number, number][] = [];
                for (const p of entity.points) {
                    if (isValidCoord(p)) {
                        leaderPoints.push(normalizeCoord(p));
                    }
                }
                if (leaderPoints.length < 2) {
                    return { valid: false, error: 'LEADER: en az 2 nokta gerekli' };
                }
                sanitized.points = leaderPoints;
            }
            sanitized.text = entity.text || '';
            break;

        case 'INSERT':
        case 'BLOCK':
            if (!isValidCoord(entity.position)) return { valid: false, error: 'INSERT: position koordinatı geçersiz' };
            sanitized.position = normalizeCoord(entity.position);
            sanitized.blockName = entity.blockName || 'UNNAMED';
            sanitized.scale = entity.scale || [1, 1, 1];
            sanitized.rotation = typeof entity.rotation === 'number' ? entity.rotation : 0;
            break;
    }

    return { valid: true, sanitized };
};

export class OpenRouterService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }

    private getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': getRefererUrl(),
            'X-Title': 'CAD Online AI',
            'Content-Type': 'application/json',
        };
    }

    // Retry-After header'ını parse et
    private parseRetryAfter(response: Response): number {
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
                return seconds * 1000; // ms'ye çevir
            }
        }
        return RETRY_CONFIG.baseDelay;
    }

    private async handleResponseError(response: Response, attempt: number = 0): Promise<{ shouldRetry: boolean; retryDelay: number; error: Error }> {
        const status = response.status;
        let errorMessage = `API Hatası (${status})`;
        let shouldRetry = false;
        let retryDelay = 0;

        try {
            const errorData = await response.json();
            if (errorData.error) {
                if (status === 429) {
                    // Rate limit hatası - retry edilebilir
                    shouldRetry = attempt < RETRY_CONFIG.maxRetries;
                    retryDelay = this.parseRetryAfter(response) || calculateBackoff(attempt);

                    // Rate limit durumunu güncelle
                    rateLimitState.isLimited = true;
                    rateLimitState.retryAfter = Date.now() + retryDelay;

                    if (shouldRetry) {
                        errorMessage = `AI servisi yoğun. ${Math.ceil(retryDelay / 1000)} saniye sonra otomatik olarak tekrar denenecek... (Deneme ${attempt + 1}/${RETRY_CONFIG.maxRetries})`;
                    } else {
                        errorMessage = "AI servisi şu an çok yoğun. Lütfen birkaç dakika bekleyip tekrar deneyin veya kendi OpenRouter API anahtarınızı ekleyin (Ayarlar > AI).";
                    }
                } else if (status === 401) {
                    errorMessage = "API anahtarı geçersiz. Lütfen Ayarlar > AI bölümünden doğru bir API anahtarı girin.";
                } else if (status === 402) {
                    errorMessage = "API kredisi yetersiz. Lütfen OpenRouter hesabınıza kredi ekleyin veya farklı bir model deneyin.";
                } else if (status === 503 || status === 502) {
                    // Sunucu hatası - retry edilebilir
                    shouldRetry = attempt < RETRY_CONFIG.maxRetries;
                    retryDelay = calculateBackoff(attempt);
                    errorMessage = shouldRetry
                        ? `AI sunucusu geçici olarak kullanılamıyor. Tekrar deneniyor...`
                        : "AI sunucusu şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.";
                } else if (errorData.error.message) {
                    errorMessage = errorData.error.message;
                }
            }
        } catch (e) {
            const text = await response.text().catch(() => "");
            if (text) errorMessage += `: ${text}`;
        }

        return {
            shouldRetry,
            retryDelay,
            error: new Error(errorMessage)
        };
    }

    // Retry ile fetch wrapper
    private async fetchWithRetry(
        url: string,
        options: RequestInit,
        maxRetries: number = RETRY_CONFIG.maxRetries
    ): Promise<Response> {
        // Rate limit durumunu kontrol et
        if (rateLimitState.isLimited && Date.now() < rateLimitState.retryAfter) {
            const waitTime = rateLimitState.retryAfter - Date.now();
            console.log(`Rate limit aktif. ${Math.ceil(waitTime / 1000)} saniye bekleniyor...`);
            await delay(waitTime);
        }

        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // İstekler arası minimum süre (500ms)
                const timeSinceLastRequest = Date.now() - rateLimitState.lastRequest;
                if (timeSinceLastRequest < 500 && rateLimitState.lastRequest > 0) {
                    await delay(500 - timeSinceLastRequest);
                }

                rateLimitState.lastRequest = Date.now();
                const response = await fetch(url, options);

                if (response.ok) {
                    // Rate limit durumunu temizle
                    rateLimitState.isLimited = false;
                    return response;
                }

                // Hata durumunu analiz et
                const { shouldRetry, retryDelay, error } = await this.handleResponseError(response, attempt);
                lastError = error;

                if (shouldRetry && attempt < maxRetries) {
                    console.log(`Retry ${attempt + 1}/${maxRetries}: ${retryDelay}ms sonra tekrar denenecek`);
                    await delay(retryDelay);
                    continue;
                }

                throw error;

            } catch (error) {
                if (error instanceof TypeError && error.message.includes('fetch')) {
                    // Ağ hatası - retry edilebilir
                    lastError = new Error('Ağ bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.');
                    if (attempt < maxRetries) {
                        const retryDelay = calculateBackoff(attempt);
                        console.log(`Ağ hatası, ${retryDelay}ms sonra tekrar denenecek`);
                        await delay(retryDelay);
                        continue;
                    }
                }
                throw error;
            }
        }

        throw lastError || new Error('Bilinmeyen bir hata oluştu');
    }

    async getModels(): Promise<OpenRouterModel[]> {
        if (!this.apiKey) {
            console.warn('getModels: API Key eksik');
            return [];
        }

        try {
            const response = await this.fetchWithRetry(`${BASE_URL}/models`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();

            if (!data || !Array.isArray(data.data)) {
                console.warn('getModels: Beklenmeyen API yanıtı formatı', data);
                return [];
            }

            return data.data;
        } catch (error) {
            console.error('Error fetching models:', error);
            throw error;
        }
    }

    async generateCompletion(prompt: string, model: string, systemPrompt?: string): Promise<{ entities: any[]; warnings?: string[] }> {
        if (!this.apiKey) throw new Error('API Key eksik. Lütfen Ayarlar\'dan API anahtarınızı girin.');
        if (!model) throw new Error('Model seçili değil. Lütfen bir AI modeli seçin.');
        if (!prompt || prompt.trim().length === 0) throw new Error('Çizim komutu boş olamaz.');

        const finalSystemPrompt = systemPrompt || `Sen profesyonel, ileri seviye bir CAD – Teknik Çizim – İnşaat, Altyapı ve Hidrolik Yapılar Yapay Zekâ Ajanısın.

Amacın:
Kullanıcının Türkçe veya İngilizce verdiği doğal dil komutlarını analiz etmek,
bunları mühendislik bilgisiyle yorumlamak
ve SADECE tanımlı CAD entity'lerini kullanarak
DOĞRUDAN KULLANILABİLİR, GEÇERLİ ve HATASIZ JSON çıktısı üretmektir.

Bu JSON çıktısı:
- Web tabanlı bir CAD uygulamasında (React + Three.js)
- Hiçbir ek işleme gerek kalmadan
- Çizim motoru tarafından birebir render edilecektir.

================================================================
TEMEL DAVRANIŞ FELSEFESİ
================================================================

• Sen bir sohbet botu değil, kural tabanlı profesyonel bir CAD üretim motorusun
• Mimar, inşaat mühendisi ve altyapı projecisi gibi düşünürsün
• Eksik bilgi varsa çizimi DURDURMAZ, mühendislik varsayımları ile TAMAMLARSIN
• Karmaşık yapıları HER ZAMAN temel geometrilere ayırırsın
• Çıktının doğruluğu, estetiğinden daha önemlidir
• Çizimler uygulama projesi kalitesinde olur

================================================================
ZORUNLU VE DEĞİŞMEZ KURALLAR
================================================================

1. SADECE JSON döndür - Açıklama, Markdown, Kod bloğu, Yorum, Özür YAZMA

2. TÜM ÇİZİMLER İÇİN BAŞLANGIÇ VE TEMİZLİK KURALI
   - Tüm çizimler (0,0,0) noktasından başlar
   - Daha önce çizilmiş entity'ler VARSAYILSA BİLE TAMAMEN SİLİNİR
   - Boş sayfa kabul edilerek yeni çizim başlatılır
   - Üzerine ekleme YAPMA

3. Koordinat Sistemi: X → sağ, Y → yukarı, Z → 0 (2D)
   Varsayılan birim: mm | Metre verilirse ×1000

4. Aynı projede yerleşim: Plan → altta, Kesit → planın üstünde, Görünüş → en üstte (Y ekseninde ayrıştır)

5. Ölçüler belirtilmezse mühendislik varsayımları kullan:
   Duvar: 200–300 mm | Kat yüksekliği: 3000 mm | Kapı: 900×2100 mm
   Pencere: 1200–1500 mm | Betonarme et kalınlığı: 100–300 mm | Kanal şevi: 1:1.5

================================================================
ÇİZİMİ GEOMETRİYE BÖLME KURALI
================================================================

Duvar → LWPOLYLINE | Kapı → LINE + ARC | Pencere → paralel LINE
Kolon → CIRCLE veya dikdörtgen LWPOLYLINE | Kiriş → LINE / LWPOLYLINE
Merdiven → paralel LINE grupları | Kanal → LINE + LWPOLYLINE
İstinad → temel + gövde + arka dolgu

ASLA: "Duvar" diye soyut nesne çizme, Block mantığı kullanma

================================================================
DESTEKLENEN ENTITY TÜRLERİ
================================================================

LINE: { "type": "LINE", "start": [x,y,0], "end": [x,y,0], "layer": "0", "color": "#FFFFFF" }
CIRCLE: { "type": "CIRCLE", "center": [x,y,0], "radius": number, "layer": "0" }
ARC: { "type": "ARC", "center": [x,y,0], "radius": number, "startAngle": radyan, "endAngle": radyan }
LWPOLYLINE: { "type": "LWPOLYLINE", "vertices": [[x,y,0], ...], "closed": true/false, "layer": "0" }
ELLIPSE: { "type": "ELLIPSE", "center": [x,y,0], "rx": number, "ry": number, "rotation": 0 }
POINT: { "type": "POINT", "position": [x,y,0] }
SPLINE: { "type": "SPLINE", "controlPoints": [[x,y,0], ...], "degree": 3, "closed": false }
DONUT: { "type": "DONUT", "center": [x,y,0], "innerRadius": number, "outerRadius": number }
TEXT: { "type": "TEXT", "position": [x,y,0], "text": "metin", "height": 5, "rotation": 0, "justification": "left/center/right" }
MTEXT: { "type": "MTEXT", "position": [x,y,0], "text": "metin", "height": 5, "width": 100 }
DIMENSION (DIMLINEAR): { "type": "DIMENSION", "dimType": "DIMLINEAR", "start": [x,y,0], "end": [x,y,0], "dimLinePosition": [x,y,0], "textHeight": 3 }
DIMENSION (DIMRADIUS): { "type": "DIMENSION", "dimType": "DIMRADIUS", "center": [x,y,0], "start": [x,y,0], "end": [x,y,0], "dimLinePosition": [x,y,0] }
DIMENSION (DIMDIAMETER): { "type": "DIMENSION", "dimType": "DIMDIAMETER", "center": [x,y,0], "start": [x,y,0], "end": [x,y,0], "dimLinePosition": [x,y,0] }
DIMENSION (DIMANGULAR): { "type": "DIMENSION", "dimType": "DIMANGULAR", "center": [x,y,0], "start": [x,y,0], "end": [x,y,0], "startAngle": radyan, "endAngle": radyan }
HATCH: { "type": "HATCH", "boundary": { "vertices": [[x,y,0], ...], "closed": true }, "pattern": "SOLID/ANSI31/ANSI32/ANSI33/ANSI34/ANSI35/ANSI36/ANSI37/ANSI38", "scale": 1, "rotation": 0 }
TABLE: { "type": "TABLE", "position": [x,y,0], "rows": 3, "cols": 4, "rowHeight": 10, "colWidth": 30, "cellData": [[...], [...]] }

Tanımsız alan, parametre veya entity KULLANMA.

================================================================
KESİT VE GÖRÜNÜŞ KURALLARI
================================================================

Kesitlerde:
- Kesilen elemanlar kalın çizgi varsayılır
- Beton → HATCH ANSI31 | Toprak → HATCH ANSI32 | Dolgu → HATCH ANSI35 | Çim → HATCH ANSI36
- Kotlar TEXT ile yazılır

Görünüşlerde:
- Kapı/pencere boşlukları gösterilir
- Çatı eğimleri çizilir
- Oranlar korunur

================================================================
KANAL, TAŞKIN VE İSTİNAD ÖZEL KURALLARI
================================================================

Trapez Kanal: Alt genişlik, Üst genişlik, Yan şevler, Beton → ANSI31, Toprak → ANSI32
U Kanal: İç boşluk + beton gövde AYRI, Et kalınlığı: 100–150 mm
Taşkın / İstinad Duvarı: Temel, Gövde, Arka dolgu taraması, Toprak basıncı yön oku (LINE)

================================================================
KATMAN ZORUNLULUĞU
================================================================

Tüm entity'ler anlamlı layer kullanır:
Walls, Doors, Windows, Columns, Beams, Slabs, Concrete, Earth, Water, FloodWalls, RetainingWalls, Channels, Culverts, Drainage, Roads, Landscape, Dimensions, Text, Hatches, TitleBlock

================================================================
ANTET (BAŞLIK BLOĞU)
================================================================

Kullanıcı isterse: Sağ alt köşede, Layer: TitleBlock
İçerik: Proje Adı, Çizen, Tarih, Ölçek, Pafta No, Revizyon

================================================================
DÜZENLEME KOMUTLARI
================================================================

Kullanıcı kırp, uzat, pah kır, yuvarlat, offset al, dizi yap, join, explode gibi komutlar verirse:
SADECE { "operation": "TRIM / EXTEND / FILLET / CHAMFER / OFFSET / ARRAY / JOIN / EXPLODE / BREAK / STRETCH", ... } formatında JSON üret.

================================================================
ÇIKTI FORMATI (ZORUNLU)
================================================================

Yeni çizim: { "entities": [ { ... }, { ... } ] }
Düzenleme: { "operation": "...", ... }

JSON DIŞINDA TEK BİR KARAKTER BİLE YAZMA.
`;

        const request: AICompletionRequest = {
            model: model,
            messages: [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2
        };

        try {
            const response = await this.fetchWithRetry(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(request)
            });

            const data: AIResponse = await response.json();

            // Response yapısını kontrol et
            if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
                throw new Error('AI\'dan geçersiz yanıt alındı. Lütfen tekrar deneyin.');
            }

            const content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('AI\'dan içerik alınamadı. Model farklı bir formatta yanıt vermiş olabilir.');
            }

            // Markdown formatını temizle (çeşitli formatları destekle)
            let cleanContent = content
                .replace(/```(?:json|JSON|plaintext|text)?\s*/g, '')
                .replace(/```/g, '')
                .trim();

            // JSON olmayan prefix/suffix'leri temizle
            const jsonStart = cleanContent.indexOf('{');
            const jsonEnd = cleanContent.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
            }

            let result: any;
            try {
                result = JSON.parse(cleanContent);
            } catch (parseError) {
                // JSON parse hatası - kullanıcıya anlamlı mesaj ver
                const truncatedContent = cleanContent.length > 200
                    ? cleanContent.substring(0, 200) + '...'
                    : cleanContent;
                console.warn("AI JSON dışı içerik döndürdü:", truncatedContent);
                throw new Error(`AI geçerli bir çizim yanıtı döndüremedi. AI yanıtı: "${truncatedContent}"`);
            }

            // Entities array'ini kontrol et - farklı formatları destekle
            let entities: any[] = [];

            if (result.entities && Array.isArray(result.entities)) {
                entities = result.entities;
            } else if (Array.isArray(result)) {
                // Doğrudan array döndürülmüş olabilir
                entities = result;
            } else if (result.data && Array.isArray(result.data)) {
                entities = result.data;
            } else if (result.objects && Array.isArray(result.objects)) {
                entities = result.objects;
            } else {
                // Son çare: objede array olan ilk property'yi bul
                for (const key of Object.keys(result)) {
                    if (Array.isArray(result[key]) && result[key].length > 0 && result[key][0]?.type) {
                        entities = result[key];
                        console.log(`Entities "${key}" key'inde bulundu`);
                        break;
                    }
                }
            }

            if (entities.length === 0) {
                console.warn('AI yanıtı:', result);
                throw new Error('AI yanıtı beklenen "entities" dizisini içermiyor. Lütfen farklı bir komut deneyin.');
            }

            // result.entities'i güncelle
            result = { entities };

            // Her entity'yi doğrula
            const validatedEntities: any[] = [];
            const warnings: string[] = [];

            for (let i = 0; i < result.entities.length; i++) {
                const validation = validateEntity(result.entities[i]);
                if (validation.valid && validation.sanitized) {
                    validatedEntities.push(validation.sanitized);
                } else {
                    warnings.push(`Entity ${i + 1}: ${validation.error}`);
                }
            }

            if (validatedEntities.length === 0 && result.entities.length > 0) {
                throw new Error(`Hiçbir entity doğrulanamadı. Hatalar: ${warnings.join('; ')}`);
            }

            return {
                entities: validatedEntities,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error) {
            console.error('AI completion hatası:', error);
            throw error;
        }
    }

    async testModel(model: string): Promise<string> {
        if (!this.apiKey) throw new Error('API Key eksik');
        if (!model) throw new Error('Model seçili değil');

        const request: AICompletionRequest = {
            model: model,
            messages: [
                { role: 'user', content: 'Say "CAD Test Successful" if you can hear me. Keep it short.' }
            ],
            max_tokens: 20
        };

        try {
            const response = await this.fetchWithRetry(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(request)
            });

            const data: AIResponse = await response.json();

            if (!data?.choices?.[0]?.message?.content) {
                return 'Test başarılı (yanıt içeriği boş)';
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error('Model test hatası:', error);
            throw error;
        }
    }

    // =====================================================
    // MULTI-AGENT SYSTEM METHODS
    // =====================================================

    // Ajan prompt'ları
    private getAgentPrompt(agent: string): string {
        const GLOBAL_CONTEXT = {
            unit: "mm",
            origin: [0, 0, 0],
            forceZ: 0,
            drawingPlane: "XY",
            clearBeforeDraw: true,
            drawingStandard: "ISO"
        };

        const prompts: Record<string, string> = {
            requestAnalyzer: `Sen bir CAD istek analiz ajanısın. Kullanıcının Türkçe veya İngilizce komutunu analiz et.

GÖREV: Komutu sınıflandır ve anahtar bilgileri çıkar.

ÇIKTI FORMATI (SADECE JSON):
{
  "commandType": "draw|edit|query|unknown",
  "drawingType": "plan|section|elevation|detail|other",
  "drawingScope": "single | multi | full_project",
  "mainSubject": "string (ana konu)",
  "dimensions": { "width": null|number, "height": null|number, "depth": null|number },
  "elements": ["string array - istenilen elemanlar"],
  "modifiers": ["string array - ek özellikler"],
  "confidence": 0.0-1.0
}

JSON DIŞINDA HİÇBİR ŞEY YAZMA.`,

            structureAgent: `Sen bir YAPI ANALİZ AJANISIN (Structure Agent). 
GÖREV: Kullanıcının isteğini En Alt Tipe (SubType) kadar analiz et.
ASLA genel tip verme (Örn: "Retaining Wall" YETMEZ, "cantilever_L" olmalı).

ÖRNEK: "U kanal çiz"
{
  "structureType": "u_channel",
  "subType": "standard_u",
  "components": ["base_slab", "left_wall", "right_wall"],
  "relations": ["walls_on_base", "symmetric"]
}

ÖRNEK: "İstinat duvarı çiz"
{
  "structureType": "retaining_wall",
  "subType": "cantilever_L", 
  "components": ["foundation_toe", "foundation_heel", "stem", "shear_key"]
}

ÇIKTI FORMATI (SADECE JSON):
{
  "structureType": "string",
  "subType": "string (L_type, T_type, gravity, U_channel, box_culvert)",
  "components": ["string array - parçaların teknik adları"],
  "relations": ["string array - parçalar arası ilişkiler"]
}

JSON DIŞINDA HİÇBİR ŞEY YAZMA.`,

            engineeringDetail: `Sen bir MÜHENDİSLİK DETAY AJANISIN. Yapının TEK KARAR MERKEZİSİN (Single Source of Truth).

GÖREV: Yapı bileşenleri için KESİN VE NİHAİ ölçüleri belirle.
Oran hesabı yapma, direkt mm cinsinden değer ver.

İPUÇLARI:
- İstinat Duvarı (L-Tipi):
  - Foundation Total Width = 0.5-0.7 * Height
  - Toe Width = 0.3 * Foundation Width
  - Stem Thickness = H/12 (min 250mm)

ÇIKTI FORMATI (SADECE JSON):
{
  "specs": {
    "component_group": { 
        "total_width": number, 
        "height": number,
        "detail_param": number 
    }
  }
}

ÖRNEK ÇIKTI:
{
  "specs": {
    "foundation": { "width": 2800, "toe_length": 1000, "heel_length": 1800, "thickness": 600 },
    "stem": { "height": 4000, "thickness_bottom": 400, "thickness_top": 250 }
  }
}

JSON DIŞINDA HİÇBİR ŞEY YAZMA.`,

            geometryGenerator: `Sen bir GEOMETRİ HESAPLAYICI AJANISIN. YORUM YOK, SADECE MATEMATİK VAR.
Engineering Detail'den gelen ölçüleri KURAL TABANLI olarak yerleştir.

GLOBAL SİSTEM AYARLARI:
${JSON.stringify(GLOBAL_CONTEXT, null, 2)}

KURALLAR (Rules):
1. ORIGIN (0,0) Daima temel sol alt köşesi olsun (veya mantıklı bir referans).
2. L-Tipi İstinat Şablonu:
   - Foundation: Rect(0,0) -> (Width, Thickness)
   - Stem: Foundation üstüne, Toe bitiminden başlar.
     - Stem X Start = Foundation.Toe_Length
     - Stem Y Start = Foundation.Thickness
3. U-Kanal Şablonu:
   - Base Slab: Merkezde veya (0,0)'da
   - Walls: Base slab'in iki ucunda, slab üstünde.

ÇIKTI FORMATI (SADECE JSON):
{
  "geometries": [
    {
      "id": "foundation", // Engineering specs'teki isimle aynı olmalı
      "shape": "rect|poly",
      "points": [[0,0,0], [2800,0,0], [2800,600,0], [0,600,0]]
    }
  ]
}

JSON DIŞINDA HİÇBİR ŞEY YAZMA.`,

            cadFeaturePlanner: `Sen bir CAD EŞLEŞTİRİCİSİN. Geometrik şekilleri CAD entitylerine ve katmanlarına ata.

LAYERLAR: CONCRETE, REINFORCEMENT, DIMENSION, TEXT, HATCH

ÇIKTI FORMATI (SADECE JSON):
{
  "mapping": [
    { "geometryId": "base_slab", "entity": "LWPOLYLINE", "layer": "CONCRETE" }
  ]
}

JSON DIŞINDA HİÇBİR ŞEY YAZMA.`,

            compilerAgent: `Sen bir CAD DERLEYİCİSİSİN (Compiler). SADECE Translated Output üret.

GLOBAL SİSTEM:
${JSON.stringify(GLOBAL_CONTEXT, null, 2)}

KURALLAR:
1. Tüm Z koordinatları 0 olmak ZORUNDADIR. (2D Çizim)
2. POLYLINE ve RECT gibi alan oluşturan şekiller KAPALI (Closed) olmalıdır. (İlk ve son nokta aynı veya closed flag true)
3. Layer isimleri büyük harf ve standart olmalı (CONCRETE, DIMENSION).

ÇIKTI FORMATI (SADECE JSON):
{
  "entities": [
    { "type": "LWPOLYLINE", "layer": "CONCRETE", "closed": true, "vertices": [[x,y,0], ...] }
  ]
}
JSON DIŞINDA HİÇBİR ŞEY YAZMA.`,

            validationAgent: `Sen bir MÜHENDİSLİK DOĞRULAMA AJANISIN (Validator). 
Çizimi analiz et ve mantık hatalarını bul.

KONTROLLER:
1. Fiziksel imkansızlıklar (örn: negatif kalınlık)
2. Geometrik kopukluklar (örn: duvar havada duruyor mu?)
3. Standart dışı durumlar

ÇIKTI FORMATI (SADECE JSON):
{
  "valid": true,
  "warnings": [],
  "correctedJSON": null
}

JSON DIŞINDA HİÇBİR ŞEY YAZMA.`
        };

        return prompts[agent] || '';
    }

    // Tek bir ajanı çalıştır
    async runAgent(
        agent: string,
        input: string,
        model: string,
        temperature: number,
        maxTokens: number
    ): Promise<{ success: boolean; output: string; error?: string; duration: number; systemPrompt?: string; userPrompt?: string }> {
        const startTime = Date.now();

        if (!this.apiKey) {
            return { success: false, output: '', error: 'API Key eksik', duration: 0 };
        }

        const systemPrompt = this.getAgentPrompt(agent);
        if (!systemPrompt) {
            return { success: false, output: '', error: `Bilinmeyen ajan: ${agent}`, duration: 0 };
        }

        const request: AICompletionRequest = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: input }
            ],
            temperature,
            max_tokens: maxTokens
        };

        try {
            const response = await this.fetchWithRetry(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(request)
            });

            const data: AIResponse = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            const duration = Date.now() - startTime;
            console.log(`[${agent}] Tamamlandı (${duration}ms)`);

            return { success: true, output: content, duration, systemPrompt, userPrompt: input };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            console.error(`[${agent}] Hata:`, errorMessage);
            return { success: false, output: '', error: errorMessage, duration, systemPrompt, userPrompt: input };
        }
    }

    // Multi-agent orkestrasyon - tam pipeline
    async runOrchestration(
        userPrompt: string,
        agentsConfig: AgentsConfiguration,
        onAgentChange?: (agent: string | null) => void
    ): Promise<OrchestrationResult> {

        const agentResults: any[] = [];
        const startTime = Date.now();

        // Context yönetimi için yardımcı fonksiyon - çıktıları kısalt (Gemini 2.0 Flash için yüksek limit)
        const truncateOutput = (output: string, maxLen: number = 50000): string => {
            if (output.length <= maxLen) return output;
            return output.substring(0, maxLen) + '... [kısaltıldı]';
        };

        // Ajan sonuçlarını sakla (summary için)
        // Ajan sonuçlarını sakla (summary için)
        let analysisResult = '';
        let structureResult = '';
        let engineeringResult = '';
        let geometryResult = '';
        let featurePlanResult = '';

        console.log('🚀 Multi-Agent Orkestrasyon Başladı');

        // 1. Request Analyzer
        if (agentsConfig.requestAnalyzer.enabled) {
            onAgentChange?.('requestAnalyzer');
            const result = await this.runAgent(
                'requestAnalyzer',
                userPrompt,
                agentsConfig.requestAnalyzer.model,
                agentsConfig.requestAnalyzer.temperature,
                agentsConfig.requestAnalyzer.maxTokens
            );
            agentResults.push({ agent: 'requestAnalyzer', ...result });
            if (result.success) analysisResult = truncateOutput(result.output);
        }

        // 2. Structure Agent (Decomposition)
        if (agentsConfig.structureAgent.enabled) {
            onAgentChange?.('structureAgent');
            const context = `KULLANICI: ${userPrompt}\nANALİZ: ${analysisResult}`;
            const result = await this.runAgent(
                'structureAgent',
                context,
                agentsConfig.structureAgent.model,
                agentsConfig.structureAgent.temperature,
                agentsConfig.structureAgent.maxTokens
            );
            agentResults.push({ agent: 'structureAgent', ...result });
            if (result.success) structureResult = truncateOutput(result.output);
        }

        // 3. Engineering Detail
        if (agentsConfig.engineeringDetail.enabled) {
            onAgentChange?.('engineeringDetail');
            const engContext = `YAPI BİLEŞENLERİ: ${structureResult}`;
            const result = await this.runAgent(
                'engineeringDetail',
                engContext,
                agentsConfig.engineeringDetail.model,
                agentsConfig.engineeringDetail.temperature,
                agentsConfig.engineeringDetail.maxTokens
            );
            agentResults.push({ agent: 'engineeringDetail', ...result });
            if (result.success) engineeringResult = truncateOutput(result.output);
        }

        // 4. Geometry Generator
        if (agentsConfig.geometryGenerator && agentsConfig.geometryGenerator.enabled) {
            onAgentChange?.('geometryGenerator');
            const geoContext = `YAPI: ${structureResult}\nÖLÇÜLER: ${engineeringResult}`;
            const result = await this.runAgent(
                'geometryGenerator',
                geoContext,
                agentsConfig.geometryGenerator.model,
                agentsConfig.geometryGenerator.temperature,
                agentsConfig.geometryGenerator.maxTokens
            );
            agentResults.push({ agent: 'geometryGenerator', ...result });
            if (result.success) geometryResult = truncateOutput(result.output);
        }

        // 5. CAD Feature Planner
        if (agentsConfig.cadFeaturePlanner.enabled) {
            onAgentChange?.('cadFeaturePlanner');
            const featureContext = `GEOMETRİ: ${geometryResult}`;
            const result = await this.runAgent(
                'cadFeaturePlanner',
                featureContext,
                agentsConfig.cadFeaturePlanner.model,
                agentsConfig.cadFeaturePlanner.temperature,
                agentsConfig.cadFeaturePlanner.maxTokens
            );
            agentResults.push({ agent: 'cadFeaturePlanner', ...result });
            if (result.success) featurePlanResult = truncateOutput(result.output);
        }

        // 6. Compiler Agent (Final JSON Generation)
        onAgentChange?.('compilerAgent');
        console.log('🎨 Compiler Agent çalışıyor...');

        // Compiler context sadece mapping ve geometriyi alır, yoruma kapalıdır.
        const compilerContext = `DERLE: \nPLAN: ${featurePlanResult}\nGEOMETRİ: ${geometryResult}`;

        const drawingResult = await this.generateCompletion(
            compilerContext,
            agentsConfig.compilerAgent.model
        );
        agentResults.push({
            agent: 'compilerAgent',
            success: true,
            output: JSON.stringify(drawingResult).substring(0, 5000),
            duration: 0
        });

        // 7. Validation Agent
        let finalEntities = drawingResult.entities;
        let warnings = drawingResult.warnings || [];

        if (agentsConfig.validationAgent.enabled) {
            onAgentChange?.('validationAgent');
            const validatorInput = JSON.stringify({ entities: drawingResult.entities });
            const result = await this.runAgent(
                'validationAgent',
                validatorInput,
                agentsConfig.validationAgent.model,
                agentsConfig.validationAgent.temperature,
                agentsConfig.validationAgent.maxTokens
            );
            agentResults.push({ agent: 'validationAgent', ...result });

            if (result.success) {
                try {
                    const validation = JSON.parse(result.output.replace(/```json\s*/g, '').replace(/```/g, '').trim());
                    if (validation.warnings) {
                        warnings = [...warnings, ...validation.warnings];
                    }
                    if (validation.correctedJSON?.entities) {
                        finalEntities = validation.correctedJSON.entities;
                    }
                } catch (e) {
                    console.warn('Validator çıktısı parse edilemedi');
                }
            }
        }

        const totalDuration = Date.now() - startTime;
        console.log(`✅ Orkestrasyon tamamlandı (${totalDuration}ms, ${finalEntities.length} entity)`);

        onAgentChange?.(null);

        return {
            success: true,
            entities: finalEntities,
            warnings: warnings.length > 0 ? warnings : undefined,
            agentResults,
            totalDuration
        };
    }
}


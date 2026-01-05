// Simple types for pattern configuration
export type PatternType = 'lines' | 'cross' | 'dots' | 'solid' | 'zigzag' | 'honeycomb' | 'hexagon' | 'diamond' | 'wave' | 'dash' | 'grid';

export interface HatchPatternConfig {
    name: string;
    type: PatternType;
    angle: number; // base angle in degrees
    scale: number; // base scale
    spacing: number; // spacing between lines relative to scale
    category: 'architectural' | 'industrial' | 'natural' | 'geometric';
    color?: string; // default color suggestion
}

// Pattern categories for UI grouping
export const PATTERN_CATEGORIES = {
    architectural: { name: 'Mimari', icon: '🏠' },
    industrial: { name: 'Endüstriyel', icon: '⚙️' },
    natural: { name: 'Doğal', icon: '🌿' },
    geometric: { name: 'Geometrik', icon: '◇' },
};

// Preset patterns - expanded with professional patterns
export const PRESET_PATTERNS: Record<string, HatchPatternConfig> = {
    // Solid
    'SOLID': { name: 'Solid (Düz)', type: 'solid', angle: 0, scale: 1, spacing: 0, category: 'geometric', color: '#808080' },

    // Architectural patterns
    'ANSI31': { name: 'ANSI31 (Demir)', type: 'lines', angle: 45, scale: 1, spacing: 0.1, category: 'industrial', color: '#4a4a4a' },
    'ANSI37': { name: 'ANSI37 (Çapraz)', type: 'cross', angle: 45, scale: 1, spacing: 0.1, category: 'industrial', color: '#5a5a5a' },
    'BRICK': { name: 'Tuğla', type: 'lines', angle: 0, scale: 1, spacing: 0.2, category: 'architectural', color: '#8B4513' },
    'CONCRETE': { name: 'Beton', type: 'dots', angle: 0, scale: 1, spacing: 0.05, category: 'architectural', color: '#808080' },
    'TILE': { name: 'Karo/Fayans', type: 'grid', angle: 0, scale: 1, spacing: 0.15, category: 'architectural', color: '#D2B48C' },
    'STONE': { name: 'Taş', type: 'dots', angle: 0, scale: 1, spacing: 0.08, category: 'architectural', color: '#696969' },
    'WOOD': { name: 'Ahşap', type: 'lines', angle: 0, scale: 1, spacing: 0.05, category: 'architectural', color: '#8B4513' },
    'INSULATION': { name: 'Yalıtım', type: 'zigzag', angle: 0, scale: 1, spacing: 0.1, category: 'architectural', color: '#FFD700' },

    // Industrial patterns
    'STEEL': { name: 'Çelik', type: 'lines', angle: 45, scale: 1, spacing: 0.08, category: 'industrial', color: '#708090' },
    'ALUMINUM': { name: 'Alüminyum', type: 'cross', angle: 30, scale: 1, spacing: 0.12, category: 'industrial', color: '#C0C0C0' },
    'COPPER': { name: 'Bakır', type: 'lines', angle: 60, scale: 1, spacing: 0.1, category: 'industrial', color: '#B87333' },

    // Natural patterns
    'GRASS': { name: 'Çim', type: 'dots', angle: 0, scale: 1, spacing: 0.03, category: 'natural', color: '#228B22' },
    'EARTH': { name: 'Toprak', type: 'dots', angle: 0, scale: 1, spacing: 0.06, category: 'natural', color: '#8B4513' },
    'GRAVEL': { name: 'Çakıl', type: 'dots', angle: 0, scale: 1, spacing: 0.04, category: 'natural', color: '#A0522D' },
    'SAND': { name: 'Kum', type: 'dots', angle: 0, scale: 1, spacing: 0.02, category: 'natural', color: '#F4A460' },
    'WATER': { name: 'Su', type: 'wave', angle: 0, scale: 1, spacing: 0.1, category: 'natural', color: '#4169E1' },

    // Geometric patterns
    'HONEYCOMB': { name: 'Bal Peteği', type: 'honeycomb', angle: 0, scale: 1, spacing: 0.15, category: 'geometric', color: '#FFD700' },
    'HEXAGON': { name: 'Altıgen', type: 'hexagon', angle: 0, scale: 1, spacing: 0.2, category: 'geometric', color: '#6A5ACD' },
    'DIAMOND': { name: 'Baklava', type: 'diamond', angle: 45, scale: 1, spacing: 0.15, category: 'geometric', color: '#DC143C' },
    'ZIGZAG': { name: 'Zikzak', type: 'zigzag', angle: 0, scale: 1, spacing: 0.12, category: 'geometric', color: '#FF6347' },
    'WAVE': { name: 'Dalga', type: 'wave', angle: 0, scale: 1, spacing: 0.1, category: 'geometric', color: '#00CED1' },
    'DASH': { name: 'Kesik Çizgi', type: 'dash', angle: 0, scale: 1, spacing: 0.1, category: 'geometric', color: '#2F4F4F' },
    'DOTS_GRID': { name: 'Nokta Grid', type: 'dots', angle: 0, scale: 1, spacing: 0.1, category: 'geometric', color: '#4B0082' },
};

/**
 * Generate a pattern texture as data URI
 */
export const getPatternTexture = (patternName: string, color: string, scale: number = 1): string | null => {
    if (patternName === 'SOLID') return null;

    const config = PRESET_PATTERNS[patternName];
    if (!config) return null;

    let SIZE = 64;

    // Special handling for seamless Honeycomb
    // Period X: 3 * hexSize
    // Period Y: 1.75 * hexSize (approximation of sqrt(3)=1.732 for seamless loop)
    // We choose hexSize = 20
    // Period X = 60, Period Y = 35. LCM = 420.
    if (config.type === 'honeycomb') {
        SIZE = 420;
    }

    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Clear background (transparent)
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Set drawing styles
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    // Calculate spacing based on preset config
    let spacing = (config.spacing || 0.1) * (config.type === 'honeycomb' ? 100 : SIZE);
    if (scale !== 1) spacing /= scale;
    spacing = Math.max(4, spacing);

    // Override spacing for Honeycomb to ensure seamless fit
    if (config.type === 'honeycomb') {
        spacing = 20; // Fixed hexSize for seamless 420x420 texture
    }

    switch (config.type) {
        case 'lines':
            drawLines(ctx, SIZE, config.angle, spacing);
            break;
        case 'cross':
            drawCross(ctx, SIZE, config.angle, spacing);
            break;
        case 'dots':
            drawDots(ctx, SIZE, spacing, patternName);
            break;
        case 'grid':
            drawGrid(ctx, SIZE, spacing);
            break;
        case 'zigzag':
            drawZigzag(ctx, SIZE, spacing);
            break;
        case 'honeycomb':
            drawHoneycomb(ctx, SIZE, spacing);
            break;
        case 'hexagon':
            drawHexagon(ctx, SIZE, spacing);
            break;
        case 'diamond':
            drawDiamond(ctx, SIZE, spacing);
            break;
        case 'wave':
            drawWave(ctx, SIZE, spacing);
            break;
        case 'dash':
            drawDash(ctx, SIZE, config.angle, spacing);
            break;
        default:
            drawLines(ctx, SIZE, 45, spacing);
    }

    return canvas.toDataURL();
};

// Drawing helper functions
function drawLines(ctx: CanvasRenderingContext2D, size: number, angle: number, spacing: number) {
    ctx.beginPath();
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    for (let i = -size * 2; i < size * 3; i += spacing) {
        const x1 = i;
        const y1 = 0;
        const x2 = i - size * sin;
        const y2 = size * cos;

        ctx.moveTo(x1 * cos - y1 * sin, x1 * sin + y1 * cos);
        ctx.lineTo(x2 * cos - y2 * sin, x2 * sin + y2 * cos);
    }
    ctx.stroke();
}

function drawCross(ctx: CanvasRenderingContext2D, size: number, angle: number, spacing: number) {
    drawLines(ctx, size, angle, spacing);
    drawLines(ctx, size, angle + 90, spacing);
}

function drawDots(ctx: CanvasRenderingContext2D, size: number, spacing: number, patternName: string) {
    const isRandom = ['CONCRETE', 'GRASS', 'EARTH', 'GRAVEL', 'SAND', 'STONE'].includes(patternName);
    const dotCount = isRandom ? Math.floor(size * size / (spacing * spacing * 4)) : 0;

    if (isRandom) {
        // Random scattered dots
        for (let i = 0; i < dotCount; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = 0.5 + Math.random() * 1.5;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Grid dots
        for (let x = spacing / 2; x < size; x += spacing) {
            for (let y = spacing / 2; y < size; y += spacing) {
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function drawGrid(ctx: CanvasRenderingContext2D, size: number, spacing: number) {
    ctx.beginPath();
    // Horizontal lines
    for (let y = 0; y < size; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
    }
    // Vertical lines
    for (let x = 0; x < size; x += spacing) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
    }
    ctx.stroke();
}

function drawZigzag(ctx: CanvasRenderingContext2D, size: number, spacing: number) {
    ctx.beginPath();
    const amplitude = spacing / 2;
    for (let y = 0; y < size; y += spacing) {
        ctx.moveTo(0, y);
        for (let x = 0; x < size; x += amplitude) {
            const yOffset = (Math.floor(x / amplitude) % 2 === 0) ? -amplitude / 2 : amplitude / 2;
            ctx.lineTo(x + amplitude, y + yOffset);
        }
    }
    ctx.stroke();
}

function drawHoneycomb(ctx: CanvasRenderingContext2D, size: number, spacing: number) {
    const hexSize = spacing;
    // Use distorted height for seamless tiling: h = hexSize * 1.75 / 2
    // True height would be hexSize * sqrt(3) / 2 ~= hexSize * 1.732 / 2
    // 1.75 allows integer period with period Y = 3.5r = 1.75d
    const h = hexSize * 1.75 / 2;

    ctx.beginPath();
    // Draw expanding beyond bounds to ensure edges are covered
    for (let row = -2; row < size / h + 2; row++) {
        for (let col = -2; col < size / (hexSize * 1.5) + 2; col++) {
            const cx = col * hexSize * 1.5;
            const cy = row * h * 2 + (col % 2 === 0 ? 0 : h);
            drawHexagonShape(ctx, cx, cy, hexSize / 2);
        }
    }
    ctx.stroke();
}

function drawHexagonShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
    for (let i = 0; i < 6; i++) {
        const angle = (i * 60 - 30) * Math.PI / 180;
        const nextAngle = ((i + 1) * 60 - 30) * Math.PI / 180;
        ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        ctx.lineTo(cx + r * Math.cos(nextAngle), cy + r * Math.sin(nextAngle));
    }
}

function drawHexagon(ctx: CanvasRenderingContext2D, size: number, spacing: number) {
    drawHoneycomb(ctx, size, spacing * 1.5);
}

function drawDiamond(ctx: CanvasRenderingContext2D, size: number, spacing: number) {
    ctx.beginPath();
    const d = spacing;
    for (let y = 0; y < size + d; y += d) {
        for (let x = 0; x < size + d; x += d) {
            const offset = ((y / d) % 2 === 0) ? 0 : d / 2;
            ctx.moveTo(x + offset, y - d / 2);
            ctx.lineTo(x + offset + d / 2, y);
            ctx.lineTo(x + offset, y + d / 2);
            ctx.lineTo(x + offset - d / 2, y);
            ctx.closePath();
        }
    }
    ctx.stroke();
}

function drawWave(ctx: CanvasRenderingContext2D, size: number, spacing: number) {
    ctx.beginPath();
    const amplitude = spacing / 3;
    const frequency = (2 * Math.PI) / spacing;

    for (let y = 0; y < size; y += spacing) {
        ctx.moveTo(0, y);
        for (let x = 0; x <= size; x += 2) {
            ctx.lineTo(x, y + Math.sin(x * frequency) * amplitude);
        }
    }
    ctx.stroke();
}

function drawDash(ctx: CanvasRenderingContext2D, size: number, angle: number, spacing: number) {
    ctx.beginPath();
    const rad = (angle * Math.PI) / 180;
    const dashLength = spacing * 0.6;
    const gapLength = spacing * 0.4;

    for (let i = -size; i < size * 2; i += spacing) {
        for (let j = 0; j < size; j += dashLength + gapLength) {
            const x1 = i + Math.cos(rad) * j;
            const y1 = Math.sin(rad) * j;
            const x2 = i + Math.cos(rad) * (j + dashLength);
            const y2 = Math.sin(rad) * (j + dashLength);
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
    }
    ctx.stroke();
}

/**
 * Generate a small preview thumbnail for pattern gallery
 */
export const getPatternPreview = (patternName: string, size: number = 32): string => {
    const config = PRESET_PATTERNS[patternName];
    if (!config) return '';

    const color = config.color || '#666666';
    const texture = getPatternTexture(patternName, color, 0.5);

    if (patternName === 'SOLID' || !texture) {
        // Return a solid color preview
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, size, size);
        }
        return canvas.toDataURL();
    }

    return texture;
};


/**
 * Ölçülendirme Ayarları ve Yapılandırması
 * Dimension Settings and Configuration
 */

import type { Point } from './entities';

// Ok şekilleri
export type ArrowStyle =
  | 'closed'        // Kapalı ok (standart üçgen)
  | 'open'          // Açık ok (V şekli)
  | 'dot'           // Nokta
  | 'arrowDot'      // Oklu nokta
  | 'architectural' // Mimari ok (slash)
  | 'none';         // Ok yok

// Ok yönü
export type ArrowDirection = 'inside' | 'outside' | 'both';

// Metin hizalaması
export type TextAlignment =
  | 'above'
  | 'below'
  | 'center'
  | 'left'
  | 'right';

// Metin hareketi (uzay kısıtlamasında)
export type TextMovement =
  | 'moveLine'      // Çizgiyi hareket ettir
  | 'moveText'      // Metni hareket ettir
  | 'addLeader';    // Lider çizgi ekle

// Ölçü birimi gösterimi
export type UnitDisplay =
  | 'none'          // Birim gösterme
  | 'prefix'        // Önek (mm, cm, m)
  | 'suffix'        // Sonek (25 mm)
  | 'symbol';       // Sembol (Ø, R)

// Birim sembolleri
export const UNIT_SYMBOLS = {
  mm: 'mm',
  cm: 'cm',
  m: 'm',
  inch: '"',
  feet: '\''
};

// Ondalık basamak formatları
export type DecimalFormat =
  | '0'       // 0
  | '0.0'     // 1 basamak
  | '0.00'    // 2 basamak
  | '0.000'   // 3 basamak
  | '0.0000'  // 4 basamak
  | 'fraction'; // Kesir (1/2, 3/4)

// Açı formatları
export type AngleFormat =
  | 'decimal'    // Ondalıklı derece (45.5°)
  | 'degMinSec'  // Derece-Dakika-Saniye (45°30'00")
  | 'radian'     // Radyan (0.794)
  | 'gradian';   // Gradyan (50.66g)

// Varsayılan ölçü ayarları
export const DEFAULT_DIMENSION_SETTINGS: DimensionSettings = {
  // Genel ayarlar
  scale: 1.0,
  precision: '0.00',
  angleFormat: 'decimal',
  anglePrecision: 1,

  // Birim
  unitDisplay: 'suffix',
  showUnitSymbol: true,
  useDrawingScale: true,

  // Oklar
  arrowStyle: 'closed',
  arrowSize: 2.5,
  arrowDirection: 'both',
  arrowSizeMultiplier: 1.0,

  // Çizgiler
  extensionLineOffset: 1.5,    // Nesneden uzaklık
  extensionLineExtend: 1.25,   // Ölçü çizgisinden taşma
  dimLineWeight: 1.0,          // Ölçü çizgisi kalınlığı
  extLineWeight: 0.5,          // Uzantı çizgisi kalınlığı

  // Metin
  textHeight: 2.5,
  textGap: 0.5,                // Ölçü çizgisinden uzaklık
  textAlignment: 'center',
  textRotation: 'aligned',     // aligned, horizontal
  textMovement: 'moveLine',
  textColor: '#ffffff',
  textBackgroundColor: 'transparent',

  // Renkler
  dimLineColor: '#ffffff',
  extLineColor: '#ffffff',
  arrowColor: '#ffffff',

  // Sıfır gösterimi
  suppressLeadingZeros: false,  // 0.25 -> .25
  suppressTrailingZeros: false, // 1.00 -> 1.

  // Alternatif birimler
  alternateUnits: {
    enabled: false,
    unit: 'inch',
    precision: '0.00',
    display: 'brackets' // brackets, below
  }
};

// Ölçü ayarları arayüzü
export interface DimensionSettings {
  // Genel ayarlar
  scale: number;                    // Genel ölçek faktörü
  precision: DecimalFormat;         // Ondalık hassasiyet
  angleFormat: AngleFormat;         // Açı formatı
  anglePrecision: number;           // Açı hassasiyeti (derece basamağı)

  // Birim
  unitDisplay: UnitDisplay;         // Birim gösterimi
  showUnitSymbol: boolean;          // Birim sembolü göster
  useDrawingScale: boolean;         // Çizim ölçeğini kullan

  // Oklar
  arrowStyle: ArrowStyle;           // Ok şekli
  arrowSize: number;                // Ok boyutu
  arrowDirection: ArrowDirection;   // Ok yönü
  arrowSizeMultiplier: number;      // Ok boyutu çarpanı

  // Çizgiler
  extensionLineOffset: number;      // Uzantı çizgisi ofseti
  extensionLineExtend: number;      // Uzantı çizgisi uzantısı
  dimLineWeight: number;            // Ölçü çizgisi kalınlığı
  extLineWeight: number;            // Uzantı çizgisi kalınlığı

  // Metin
  textHeight: number;               // Metin yüksekliği
  textGap: number;                  // Metin boşluğu
  textAlignment: TextAlignment;     // Metin hizalaması
  textRotation: 'aligned' | 'horizontal'; // Metin rotasyonu
  textMovement: TextMovement;       // Metin hareketi
  textColor: string;                // Metin rengi
  textBackgroundColor: string;      // Metin arka plan rengi

  // Renkler
  dimLineColor: string;             // Ölçü çizgisi rengi
  extLineColor: string;             // Uzantı çizgisi rengi
  arrowColor: string;               // Ok rengi

  // Sıfır gösterimi
  suppressLeadingZeros: boolean;    // Baştaki sıfırları gizle
  suppressTrailingZeros: boolean;   // Sondaki sıfırları gizle

  // Alternatif birimler
  alternateUnits: {
    enabled: boolean;
    unit: keyof typeof UNIT_SYMBOLS;
    precision: DecimalFormat;
    display: 'brackets' | 'below';
  };
}

/**
 * Ölçü değerini formatla
 */
export const formatDimensionValue = (
  value: number,
  settings: DimensionSettings,
  unit: string = 'mm'
): string => {
  let formatted = '';

  // Ondalık formatlama
  switch (settings.precision) {
    case '0':
      formatted = Math.round(value).toString();
      break;
    case '0.0':
      formatted = value.toFixed(1);
      break;
    case '0.00':
      formatted = value.toFixed(2);
      break;
    case '0.000':
      formatted = value.toFixed(3);
      break;
    case '0.0000':
      formatted = value.toFixed(4);
      break;
    case 'fraction':
      // Kesir formatına çevir
      formatted = toFraction(value);
      break;
  }

  // Sıfır gizleme
  if (settings.suppressLeadingZeros) {
    formatted = formatted.replace(/^0\./, '.');
  }
  if (settings.suppressTrailingZeros) {
    formatted = formatted.replace(/\.?0+$/, '');
  }

  // Birim ekle
  if (settings.showUnitSymbol && settings.unitDisplay !== 'none') {
    const symbol = UNIT_SYMBOLS[unit as keyof typeof UNIT_SYMBOLS] || unit;
    if (settings.unitDisplay === 'prefix') {
      formatted = symbol + formatted;
    } else if (settings.unitDisplay === 'suffix') {
      formatted = formatted + ' ' + symbol;
    }
  }

  return formatted;
};

/**
 * Açı değerini formatla
 */
export const formatAngleValue = (
  radians: number,
  settings: DimensionSettings
): string => {
  const degrees = radians * (180 / Math.PI);

  switch (settings.angleFormat) {
    case 'decimal':
      return `${degrees.toFixed(settings.anglePrecision)}°`;
    case 'degMinSec':
      return toDegMinSec(degrees);
    case 'radian':
      return `${radians.toFixed(4)} rad`;
    case 'gradian':
      const gradians = degrees * (400 / 360);
      return `${gradians.toFixed(settings.anglePrecision)}g`;
    default:
      return `${degrees.toFixed(settings.anglePrecision)}°`;
  }
};

/**
 * Ondalık sayıyı kesre çevir
 */
function toFraction(decimal: number): string {
  const tolerance = 1.0E-9;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = decimal;
  do {
    const a = Math.floor(b);
    let aux = h1;
    h1 = a * h1 + h2;
    h2 = aux;
    aux = k1;
    k1 = a * k1 + k2;
    k2 = aux;
    b = 1 / (b - a);
  } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);

  // Pay ve paydayı basitleştir
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(h1, k1);
  const numerator = Math.round(h1 / divisor);
  const denominator = Math.round(k1 / divisor);

  if (denominator === 1) {
    return numerator.toString();
  }
  return `${numerator}/${denominator}`;
}

/**
 * Dereceyi derece-dakika-saniye formatına çevir
 */
function toDegMinSec(degrees: number): string {
  const deg = Math.floor(degrees);
  const minFloat = (degrees - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${min}'${sec}"`;
}

/**
 * Ok koordinatlarını hesapla
 */
export const calculateArrowCoords = (
  tip: Point,
  angle: number,
  size: number,
  style: ArrowStyle,
  inward: boolean = true
): { points: Point[]; filled: boolean } => {
  const arrowAngle = Math.PI / 6; // 30 derece
  const direction = inward ? 1 : -1;

  switch (style) {
    case 'closed':
      return {
        points: [
          tip,
          [
            tip[0] + direction * size * Math.cos(angle + Math.PI - arrowAngle),
            tip[1] + direction * size * Math.sin(angle + Math.PI - arrowAngle),
            0
          ],
          [
            tip[0] + direction * size * Math.cos(angle + Math.PI + arrowAngle),
            tip[1] + direction * size * Math.sin(angle + Math.PI + arrowAngle),
            0
          ]
        ],
        filled: true
      };

    case 'open':
      return {
        points: [
          [
            tip[0] + direction * size * Math.cos(angle + Math.PI - arrowAngle),
            tip[1] + direction * size * Math.sin(angle + Math.PI - arrowAngle),
            0
          ],
          tip,
          [
            tip[0] + direction * size * Math.cos(angle + Math.PI + arrowAngle),
            tip[1] + direction * size * Math.sin(angle + Math.PI + arrowAngle),
            0
          ]
        ],
        filled: false
      };

    case 'dot':
      return {
        points: [tip], // Merkez nokta
        filled: true
      };

    case 'arrowDot':
      // Ok ve nokta kombinasyonu
      return {
        points: [
          tip,
          [
            tip[0] + direction * size * Math.cos(angle + Math.PI - arrowAngle),
            tip[1] + direction * size * Math.sin(angle + Math.PI - arrowAngle),
            0
          ],
          [
            tip[0] + direction * size * Math.cos(angle + Math.PI + arrowAngle),
            tip[1] + direction * size * Math.sin(angle + Math.PI + arrowAngle),
            0
          ]
        ],
        filled: true
      };

    case 'architectural':
      // Slash stili
      const slashSize = size * 1.5;
      return {
        points: [
          [
            tip[0] + direction * slashSize * Math.cos(angle + Math.PI - arrowAngle * 0.5),
            tip[1] + direction * slashSize * Math.sin(angle + Math.PI - arrowAngle * 0.5),
            0
          ],
          [
            tip[0] + direction * slashSize * Math.cos(angle + Math.PI + arrowAngle * 0.5),
            tip[1] + direction * slashSize * Math.sin(angle + Math.PI + arrowAngle * 0.5),
            0
          ]
        ],
        filled: false
      };

    case 'none':
    default:
      return {
        points: [],
        filled: false
      };
  }
};

/**
 * Ölçü ayarlarını localStorage'dan yükle
 */
export const loadDimensionSettings = (): DimensionSettings => {
  try {
    const saved = localStorage.getItem('dimension_settings');
    if (saved) {
      return { ...DEFAULT_DIMENSION_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load dimension settings:', e);
  }
  return { ...DEFAULT_DIMENSION_SETTINGS };
};

/**
 * Ölçü ayarlarını localStorage'a kaydet
 */
export const saveDimensionSettings = (settings: DimensionSettings): void => {
  try {
    localStorage.setItem('dimension_settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save dimension settings:', e);
  }
};

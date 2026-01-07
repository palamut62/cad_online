// Unit conversion and formatting utilities for CAD measurements

import type { DrawingUnit } from '../context/DrawingContext';

/**
 * Get the display label for a unit
 */
export function getUnitLabel(unit: DrawingUnit): string {
    switch (unit) {
        case 'mm':
            return 'mm';
        case 'cm':
            return 'cm';
        case 'm':
            return 'm';
        case 'inch':
            return '"';
        case 'feet':
            return "'";
        default:
            return unit;
    }
}

/**
 * Get the full unit name for display
 */
export function getUnitFullName(unit: DrawingUnit): string {
    switch (unit) {
        case 'mm':
            return 'Millimeter';
        case 'cm':
            return 'Centimeter';
        case 'm':
            return 'Meter';
        case 'inch':
            return 'Inch';
        case 'feet':
            return 'Feet';
        default:
            return unit;
    }
}

/**
 * Format a value with the unit label
 * @param value - The numeric value to format
 * @param unit - The drawing unit
 * @param precision - Decimal places (default: 2)
 */
export function formatWithUnit(
    value: number,
    unit: DrawingUnit,
    precision: number = 2
): string {
    const formatted = value.toFixed(precision);
    return `${formatted} ${getUnitLabel(unit)}`;
}

/**
 * Format a dimension value (e.g., for radius, diameter)
 * @param prefix - Prefix like "R" for radius, "Ø" for diameter
 * @param value - The numeric value
 * @param unit - The drawing unit
 * @param precision - Decimal places
 */
export function formatDimension(
    prefix: string,
    value: number,
    unit: DrawingUnit,
    precision: number = 2
): string {
    return `${prefix}${value.toFixed(precision)} ${getUnitLabel(unit)}`;
}

/**
 * Format size dimensions (width x height)
 */
export function formatSize(
    width: number,
    height: number,
    unit: DrawingUnit,
    precision: number = 2
): string {
    return `${width.toFixed(precision)} x ${height.toFixed(precision)} ${getUnitLabel(unit)}`;
}

// Conversion factors to mm (base unit)
const TO_MM: Record<DrawingUnit, number> = {
    mm: 1,
    cm: 10,
    m: 1000,
    inch: 25.4,
    feet: 304.8,
};

/**
 * Convert a value from one unit to another
 * @param value - The value to convert
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 */
export function convertToUnit(
    value: number,
    fromUnit: DrawingUnit,
    toUnit: DrawingUnit
): number {
    if (fromUnit === toUnit) return value;

    // Convert to mm first, then to target unit
    const inMm = value * TO_MM[fromUnit];
    return inMm / TO_MM[toUnit];
}

/**
 * Get appropriate precision based on unit
 * Smaller units need more precision in display
 */
export function getDefaultPrecision(unit: DrawingUnit): number {
    switch (unit) {
        case 'm':
            return 3;
        case 'cm':
            return 2;
        case 'mm':
            return 1;
        case 'inch':
            return 3;
        case 'feet':
            return 3;
        default:
            return 2;
    }
}

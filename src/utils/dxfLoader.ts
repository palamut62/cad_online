import DxfParser from 'dxf-parser';
import type { Entity } from '../types/entities';

interface DXFImportResult {
  entities: Entity[];
  layers: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse DXF file content and convert to internal entity format
 */
export const parseDxf = (fileContent: string): DXFImportResult => {
  const parser = new DxfParser();
  const result: DXFImportResult = {
    entities: [],
    layers: ['0'],
    errors: [],
    warnings: [],
  };

  try {
    const dxf = parser.parseSync(fileContent);
    console.log('Parsed DXF:', dxf);

    if (!dxf) {
      result.errors.push('Failed to parse DXF file');
      return result;
    }

    // Extract tables for layers
    if (dxf.tables && dxf.tables.layer && dxf.tables.layer.layers) {
      for (const layerName in dxf.tables.layer.layers) {
        if (layerName !== '0') {
          result.layers.push(layerName);
        }
      }
    }

    if (dxf.entities) {
      for (const ent of dxf.entities) {
        try {
          const converted = convertDxfEntity(ent);
          if (converted) {
            result.entities.push(converted);
          }
        } catch (err) {
          result.warnings.push(`Failed to convert entity ${ent.type}: ${err}`);
        }
      }
    }
  } catch (e) {
    result.errors.push(`DXF Parse Error: ${e}`);
  }

  return result;
};

/**
 * Convert a DXF parser entity to our internal Entity format
 */
const convertDxfEntity = (ent: any): Entity | null => {
  const color = ent.color ? aciToRgb(ent.color) : '#ffffff';
  const layer = ent.layer || '0';

  switch (ent.type) {
    case 'LINE': {
      return {
        id: generateId(),
        type: 'LINE',
        start: [ent.vertices[0].x, ent.vertices[0].y, ent.vertices[0].z || 0],
        end: [ent.vertices[1].x, ent.vertices[1].y, ent.vertices[1].z || 0],
        color,
        layer,
        visible: true,
        locked: false,
      };
    }

    case 'CIRCLE': {
      return {
        id: generateId(),
        type: 'CIRCLE',
        center: [ent.center.x, ent.center.y, ent.center.z || 0],
        radius: ent.radius,
        color,
        layer,
        visible: true,
        locked: false,
      };
    }

    case 'ARC': {
      return {
        id: generateId(),
        type: 'ARC',
        center: [ent.center.x, ent.center.y, ent.center.z || 0],
        radius: ent.radius,
        startAngle: (ent.startAngle || 0) * Math.PI / 180,
        endAngle: (ent.endAngle || 0) * Math.PI / 180,
        color,
        layer,
        visible: true,
        locked: false,
      };
    }

    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const vertices: [number, number, number][] = [];
      if (ent.vertices) {
        for (const v of ent.vertices) {
          vertices.push([v.x, v.y, v.z || 0]);
        }
      }

      if (vertices.length < 2) {
        return null;
      }

      // For open polylines, convert to line segments
      // For closed polylines, keep as LWPOLYLINE
      const closed = ent.shape || ent.closed || false;

      if (closed || ent.type === 'LWPOLYLINE') {
        return {
          id: generateId(),
          type: 'LWPOLYLINE',
          vertices,
          closed,
          color,
          layer,
          visible: true,
          locked: false,
        };
      } else {
        // Explode to line segments
        const lines: Entity[] = [];
        for (let i = 0; i < vertices.length - 1; i++) {
          lines.push({
            id: generateId(),
            type: 'LINE',
            start: vertices[i],
            end: vertices[i + 1],
            color,
            layer,
            visible: true,
            locked: false,
          });
        }
        // Return first line, rest will be added by the loop
        return lines[0];
      }
    }

    case 'POINT': {
      return {
        id: generateId(),
        type: 'POINT',
        position: [ent.position.x, ent.position.y, ent.position.z || 0],
        color,
        layer,
        visible: true,
        locked: false,
      };
    }

    case 'ELLIPSE': {
      return {
        id: generateId(),
        type: 'ELLIPSE',
        center: [ent.center.x, ent.center.y, ent.center.z || 0],
        rx: ent.majorAxisEndPoint.x * ent.axisRatio,
        ry: ent.majorAxisEndPoint.y * ent.axisRatio,
        rotation: Math.atan2(ent.majorAxisEndPoint.y, ent.majorAxisEndPoint.x),
        color,
        layer,
        visible: true,
        locked: false,
      };
    }

    case 'SPLINE': {
      const controlPoints: [number, number, number][] = [];
      if (ent.controlPoints) {
        for (const p of ent.controlPoints) {
          controlPoints.push([p.x, p.y, p.z || 0]);
        }
      }
      return {
        id: generateId(),
        type: 'SPLINE',
        controlPoints,
        degree: ent.degree || 3,
        closed: ent.closed || false,
        color,
        layer,
        visible: true,
        locked: false,
      };
    }

    case 'TEXT': {
      return {
        id: generateId(),
        type: 'TEXT',
        position: [ent.position.x, ent.position.y, ent.position.z || 0],
        text: ent.text || '',
        height: ent.textHeight || 1,
        rotation: ent.rotation ? ent.rotation * Math.PI / 180 : 0,
        color,
        layer,
        visible: true,
        locked: false,
      };
    }

    case 'MTEXT': {
      return {
        id: generateId(),
        type: 'MTEXT',
        position: [ent.position.x, ent.position.y, ent.position.z || 0],
        text: ent.text || '',
        width: ent.width || 100,
        height: ent.textHeight || 1,
        rotation: ent.rotation ? ent.rotation * Math.PI / 180 : 0,
        color,
        layer,
        visible: true,
        locked: false,
      };
    }

    default:
      console.warn(`Unsupported DXF entity type: ${ent.type}`);
      return null;
  }
};

/**
 * Convert AutoCAD Color Index (ACI) to RGB hex string
 */
const aciToRgb = (aci: number): string => {
  const colorMap: Record<number, string> = {
    0: '#000000', // BYBLOCK
    1: '#ff0000', // Red
    2: '#ffff00', // Yellow
    3: '#00ff00', // Green
    4: '#00ffff', // Cyan
    5: '#0000ff', // Blue
    6: '#ff00ff', // Magenta
    7: '#ffffff', // White/Black
    8: '#808080', // Gray
    9: '#c0c0c0', // Light Gray
  };
  return colorMap[aci] || '#ffffff';
};

/**
 * Generate unique entity ID
 */
const generateId = (): number => {
  return Date.now() + Math.random();
};

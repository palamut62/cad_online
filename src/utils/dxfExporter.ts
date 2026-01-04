import { saveAs } from 'file-saver';
import type { Entity } from '../types/entities';
import type { DXFExportOptions } from '../types/dxf';
import { DEFAULT_DXF_EXPORT_OPTIONS, UNIT_CODES, ACAD_VERSIONS } from '../types/dxf';

/**
 * DXFExporter exports entities to DXF file format
 */
export class DXFExporter {
  private options: DXFExportOptions;

  constructor(options: Partial<DXFExportOptions> = {}) {
    this.options = { ...DEFAULT_DXF_EXPORT_OPTIONS, ...options };
  }

  export(entities: Entity[]): string {
    const dxf: string[] = [];

    dxf.push(...this.buildHeader());
    dxf.push(...this.buildTables(entities));
    dxf.push(...this.buildEntities(entities));
    dxf.push('0', 'EOF');

    return dxf.join('\n');
  }

  private buildHeader(): string[] {
    const header: string[] = [];

    header.push('0', 'SECTION');
    header.push('2', 'HEADER');
    header.push('9', '$ACADVER');
    header.push('1', ACAD_VERSIONS[this.options.version]);
    header.push('9', '$INSUNITS');
    header.push('70', UNIT_CODES[this.options.units].toString());
    header.push('9', '$LUPREC');
    header.push('70', this.options.precision.toString());
    header.push('0', 'ENDSEC');

    return header;
  }

  private buildTables(entities: Entity[]): string[] {
    const tables: string[] = [];
    const layers = this.extractLayers(entities);

    tables.push('0', 'SECTION');
    tables.push('2', 'TABLES');

    // VPORT table
    tables.push('0', 'TABLE');
    tables.push('2', 'VPORT');
    tables.push('70', '0');
    tables.push('0', 'ENDTAB');

    // LTYPE table
    tables.push('0', 'TABLE');
    tables.push('2', 'LTYPE');
    tables.push('70', '1');
    tables.push('0', 'LTYPE');
    tables.push('2', 'CONTINUOUS');
    tables.push('70', '0');
    tables.push('3', 'Solid line');
    tables.push('72', '65');
    tables.push('73', '0');
    tables.push('40', '0.0');
    tables.push('0', 'ENDTAB');

    // LAYER table
    tables.push('0', 'TABLE');
    tables.push('2', 'LAYER');
    tables.push('70', layers.size.toString());

    for (const layer of layers) {
      tables.push('0', 'LAYER');
      tables.push('2', layer);
      tables.push('70', '0');
      tables.push('62', '7'); // Color
      tables.push('6', 'CONTINUOUS');
    }

    tables.push('0', 'ENDTAB');

    // STYLE table
    tables.push('0', 'TABLE');
    tables.push('2', 'STYLE');
    tables.push('70', '0');
    tables.push('0', 'ENDTAB');

    tables.push('0', 'ENDSEC');

    return tables;
  }

  private buildEntities(entities: Entity[]): string[] {
    const dxf: string[] = [];

    dxf.push('0', 'SECTION');
    dxf.push('2', 'ENTITIES');

    for (const entity of entities) {
      if (!entity.visible) continue;
      dxf.push(...this.buildEntity(entity));
    }

    dxf.push('0', 'ENDSEC');

    return dxf;
  }

  private buildEntity(entity: Entity): string[] {
    const dxf: string[] = [];

    dxf.push('8', entity.layer);
    dxf.push('62', this.colorToACI(entity.color).toString());

    switch (entity.type) {
      case 'LINE':
        dxf.push(...this.buildLine(entity));
        break;
      case 'LWPOLYLINE':
        dxf.push(...this.buildLWPolyline(entity));
        break;
      case 'CIRCLE':
        dxf.push(...this.buildCircle(entity));
        break;
      case 'ARC':
        dxf.push(...this.buildArc(entity));
        break;
      case 'ELLIPSE':
        dxf.push(...this.buildEllipse(entity));
        break;
      case 'POINT':
        dxf.push(...this.buildPoint(entity));
        break;
      case 'TEXT':
        dxf.push(...this.buildText(entity));
        break;
      case 'MTEXT':
        dxf.push(...this.buildMText(entity));
        break;
      case 'TABLE':
        dxf.push(...this.buildTable(entity));
        break;
      case 'SPLINE':
        dxf.push(...this.buildSpline(entity));
        break;
      case 'DONUT':
        dxf.push(...this.buildDonut(entity));
        break;
      default:
        console.warn(`Unsupported entity type for DXF export: ${entity.type}`);
    }

    return dxf;
  }

  private buildLine(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'LINE');
    dxf.push('10', this.format(entity.start[0]));
    dxf.push('20', this.format(entity.start[1]));
    dxf.push('30', this.format(entity.start[2] || 0));
    dxf.push('11', this.format(entity.end[0]));
    dxf.push('21', this.format(entity.end[1]));
    dxf.push('31', this.format(entity.end[2] || 0));
    return dxf;
  }

  private buildLWPolyline(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'LWPOLYLINE');
    dxf.push('90', entity.vertices.length.toString());
    dxf.push('70', entity.closed ? '1' : '0');

    for (const vertex of entity.vertices) {
      dxf.push('10', this.format(vertex[0]));
      dxf.push('20', this.format(vertex[1]));
    }

    return dxf;
  }

  private buildCircle(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'CIRCLE');
    dxf.push('10', this.format(entity.center[0]));
    dxf.push('20', this.format(entity.center[1]));
    dxf.push('30', this.format(entity.center[2] || 0));
    dxf.push('40', this.format(entity.radius));
    return dxf;
  }

  private buildArc(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'ARC');
    dxf.push('10', this.format(entity.center[0]));
    dxf.push('20', this.format(entity.center[1]));
    dxf.push('30', this.format(entity.center[2] || 0));
    dxf.push('40', this.format(entity.radius));
    dxf.push('50', this.format(entity.startAngle * 180 / Math.PI));
    dxf.push('51', this.format(entity.endAngle * 180 / Math.PI));
    return dxf;
  }

  private buildEllipse(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'ELLIPSE');
    dxf.push('10', this.format(entity.center[0]));
    dxf.push('20', this.format(entity.center[1]));
    dxf.push('30', this.format(entity.center[2] || 0));
    dxf.push('11', this.format(entity.rx * Math.cos(entity.rotation)));
    dxf.push('21', this.format(entity.rx * Math.sin(entity.rotation)));
    dxf.push('31', '0');
    dxf.push('40', this.format(entity.ry / entity.rx));
    dxf.push('41', '0');
    dxf.push('42', (Math.PI * 2).toFixed(this.options.precision));
    return dxf;
  }

  private buildPoint(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'POINT');
    dxf.push('10', this.format(entity.position[0]));
    dxf.push('20', this.format(entity.position[1]));
    dxf.push('30', this.format(entity.position[2] || 0));
    return dxf;
  }

  private buildText(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'TEXT');
    dxf.push('10', this.format(entity.position[0]));
    dxf.push('20', this.format(entity.position[1]));
    dxf.push('30', this.format(entity.position[2] || 0));
    dxf.push('40', this.format(entity.height));
    dxf.push('1', entity.text);

    if (entity.rotation !== undefined) {
      dxf.push('50', this.format(entity.rotation * 180 / Math.PI));
    }

    return dxf;
  }

  private buildMText(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'MTEXT');
    dxf.push('10', this.format(entity.position[0]));
    dxf.push('20', this.format(entity.position[1]));
    dxf.push('30', this.format(entity.position[2] || 0));
    dxf.push('40', this.format(entity.height)); // Nominal text height
    dxf.push('41', this.format(entity.width)); // Reference rectangle width
    dxf.push('71', '1'); // Attachment point (1 = top-left)
    dxf.push('72', '1'); // Drawing direction (1 = left to right)

    // MTEXT metin içeriği - satır sonlarını \\P ile değiştir
    const formattedText = entity.text.replace(/\n/g, '\\P');
    dxf.push('1', formattedText);

    if (entity.rotation !== undefined && entity.rotation !== 0) {
      dxf.push('50', this.format(entity.rotation * 180 / Math.PI));
    }

    return dxf;
  }

  private buildTable(entity: any): string[] {
    // DXF TABLE entity'si karmaşık olduğundan, basit çizgiler olarak export et
    const dxf: string[] = [];
    const { position, rows, cols, rowHeight, colWidth, rotation = 0 } = entity;
    const tableWidth = cols * colWidth;
    const tableHeight = rows * rowHeight;
    const startX = position[0];
    const startY = position[1];

    // Helper function for rotation
    const rotatePoint = (x: number, y: number): [number, number] => {
      if (rotation === 0) return [x, y];
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const dx = x - startX;
      const dy = y - startY;
      return [startX + dx * cos - dy * sin, startY + dx * sin + dy * cos];
    };

    // Yatay çizgiler
    for (let i = 0; i <= rows; i++) {
      const y = startY - i * rowHeight;
      const [x1, y1] = rotatePoint(startX, y);
      const [x2, y2] = rotatePoint(startX + tableWidth, y);

      dxf.push('0', 'LINE');
      dxf.push('8', entity.layer);
      dxf.push('10', this.format(x1));
      dxf.push('20', this.format(y1));
      dxf.push('30', '0');
      dxf.push('11', this.format(x2));
      dxf.push('21', this.format(y2));
      dxf.push('31', '0');
    }

    // Dikey çizgiler
    for (let j = 0; j <= cols; j++) {
      const x = startX + j * colWidth;
      const [x1, y1] = rotatePoint(x, startY);
      const [x2, y2] = rotatePoint(x, startY - tableHeight);

      dxf.push('0', 'LINE');
      dxf.push('8', entity.layer);
      dxf.push('10', this.format(x1));
      dxf.push('20', this.format(y1));
      dxf.push('30', '0');
      dxf.push('11', this.format(x2));
      dxf.push('21', this.format(y2));
      dxf.push('31', '0');
    }

    // Hücre içerikleri varsa TEXT olarak ekle
    if (entity.cellData) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cellText = entity.cellData[row]?.[col];
          if (cellText) {
            const cellX = startX + col * colWidth + colWidth * 0.1;
            const cellY = startY - row * rowHeight - rowHeight * 0.5;
            const [tx, ty] = rotatePoint(cellX, cellY);

            dxf.push('0', 'TEXT');
            dxf.push('8', entity.layer);
            dxf.push('10', this.format(tx));
            dxf.push('20', this.format(ty));
            dxf.push('30', '0');
            dxf.push('40', this.format(rowHeight * 0.6));
            dxf.push('1', cellText);
            if (rotation !== 0) {
              dxf.push('50', this.format(rotation * 180 / Math.PI));
            }
          }
        }
      }
    }

    return dxf;
  }

  private buildSpline(entity: any): string[] {
    const dxf: string[] = [];
    dxf.push('0', 'SPLINE');
    dxf.push('70', entity.closed ? '11' : '8'); // Flags
    dxf.push('71', entity.degree.toString()); // Degree
    dxf.push('72', '0'); // Number of knots (will be calculated)
    dxf.push('73', entity.controlPoints.length.toString()); // Number of control points
    dxf.push('74', '0'); // Number of fit points

    // Control points
    for (const cp of entity.controlPoints) {
      dxf.push('10', this.format(cp[0]));
      dxf.push('20', this.format(cp[1]));
      dxf.push('30', this.format(cp[2] || 0));
    }

    return dxf;
  }

  private buildDonut(entity: any): string[] {
    // DONUT, DXF'te LWPOLYLINE olarak kaydedilir (iki yarım daire arc)
    // Basitlik için iki daire olarak export edelim
    const dxf: string[] = [];

    // İç çember
    dxf.push('0', 'CIRCLE');
    dxf.push('8', entity.layer);
    dxf.push('10', this.format(entity.center[0]));
    dxf.push('20', this.format(entity.center[1]));
    dxf.push('30', this.format(entity.center[2] || 0));
    dxf.push('40', this.format(entity.innerRadius));

    // Dış çember
    dxf.push('0', 'CIRCLE');
    dxf.push('8', entity.layer);
    dxf.push('10', this.format(entity.center[0]));
    dxf.push('20', this.format(entity.center[1]));
    dxf.push('30', this.format(entity.center[2] || 0));
    dxf.push('40', this.format(entity.outerRadius));

    return dxf;
  }

  private extractLayers(entities: Entity[]): Set<string> {
    const layers = new Set<string>();
    for (const entity of entities) {
      layers.add(entity.layer);
    }
    return layers;
  }

  private format(value: number): string {
    return value.toFixed(this.options.precision);
  }

  private colorToACI(hexColor: string): number {
    // Simplified color mapping
    const colorMap: Record<string, number> = {
      '#ffffff': 7,
      '#ff0000': 1,
      '#ffff00': 2,
      '#00ff00': 3,
      '#00ffff': 4,
      '#0000ff': 5,
      '#ff00ff': 6,
      '#000000': 7,
    };
    return colorMap[hexColor.toLowerCase()] || 7;
  }
}

/**
 * Export entities to DXF file and trigger download
 */
export const exportDXF = (
  entities: Entity[],
  filename: string = 'drawing.dxf',
  options?: Partial<DXFExportOptions>
): void => {
  const exporter = new DXFExporter(options);
  const dxfContent = exporter.export(entities);
  const blob = new Blob([dxfContent], { type: 'application/dxf' });
  saveAs(blob, filename);
};

/**
 * Export entities to DXF string (for preview/custom handling)
 */
export const exportDXFToString = (
  entities: Entity[],
  options?: Partial<DXFExportOptions>
): string => {
  const exporter = new DXFExporter(options);
  return exporter.export(entities);
};

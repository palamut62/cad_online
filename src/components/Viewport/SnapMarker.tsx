import React from 'react';
import { Line } from '@react-three/drei';
import type { SnapMode } from '../../types/snap';
import { SNAP_COLORS, SNAP_SHAPES } from '../../types/snap';

interface SnapMarkerProps {
  point: [number, number, number];
  mode: SnapMode;
  size?: number;
}

/**
 * Visual marker for snap points in 3D viewport
 */
export const SnapMarker: React.FC<SnapMarkerProps> = ({ point, mode, size = 5 }) => {
  const color = SNAP_COLORS[mode] || '#FFFF00';
  const markerType = SNAP_SHAPES[mode] || 'square';

  const renderMarker = () => {
    switch (markerType) {
      case 'square':
        return (
          <group position={[point[0], point[1], point[2]]}>
            <Line
              points={[[-size, 0, 0], [size, 0, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[0, -size, 0], [0, size, 0]]}
              color={color}
              lineWidth={2}
            />
          </group>
        );
      case 'circle':
        return (
          <mesh position={[point[0], point[1], point[2]]}>
            <ringGeometry args={[size * 0.8, size, 32]} />
            <meshBasicMaterial color={color} wireframe />
          </mesh>
        );
      case 'triangle':
        const h = size * Math.sqrt(3) / 2;
        return (
          <group position={[point[0], point[1], point[2]]}>
            <Line
              points={[[0, size, 0], [-h, -size / 2, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[-h, -size / 2, 0], [h, -size / 2, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[h, -size / 2, 0], [0, size, 0]]}
              color={color}
              lineWidth={2}
            />
          </group>
        );
      case 'cross':
        return (
          <group position={[point[0], point[1], point[2]]}>
            <Line
              points={[[-size / 2, 0, 0], [size / 2, 0, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[0, -size / 2, 0], [0, size / 2, 0]]}
              color={color}
              lineWidth={2}
            />
          </group>
        );
      case 'diamond':
        return (
          <group position={[point[0], point[1], point[2]]}>
            <Line
              points={[[0, size, 0], [size, 0, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[size, 0, 0], [0, -size, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[0, -size, 0], [-size, 0, 0]]}
              color={color}
              lineWidth={2}
            />
            <Line
              points={[[-size, 0, 0], [0, size, 0]]}
              color={color}
              lineWidth={2}
            />
          </group>
        );
      default:
        return null;
    }
  };

  return <>{renderMarker()}</>;
};

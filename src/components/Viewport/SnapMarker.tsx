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
 * Enhanced with better visibility and animated effects
 */
export const SnapMarker: React.FC<SnapMarkerProps> = ({ point, mode, size = 8 }) => {
  const color = SNAP_COLORS[mode] || '#FFFF00';
  const markerType = SNAP_SHAPES[mode] || 'square';
  const lineWidth = 3; // Daha kalın çizgiler

  const renderMarker = () => {
    switch (markerType) {
      case 'square':
        // ENDPOINT - Kare işaretçi
        return (
          <group position={[point[0], point[1], point[2] + 0.1]}>
            {/* Dış kare */}
            <Line
              points={[
                [-size, -size, 0], [size, -size, 0],
                [size, -size, 0], [size, size, 0],
                [size, size, 0], [-size, size, 0],
                [-size, size, 0], [-size, -size, 0]
              ]}
              color={color}
              lineWidth={lineWidth}
            />
            {/* İç çapraz */}
            <Line points={[[-size * 0.5, 0, 0], [size * 0.5, 0, 0]]} color={color} lineWidth={2} />
            <Line points={[[0, -size * 0.5, 0], [0, size * 0.5, 0]]} color={color} lineWidth={2} />
          </group>
        );
      case 'circle':
        // CENTER - Daire işaretçi
        const circlePoints: [number, number, number][] = [];
        for (let i = 0; i <= 32; i++) {
          const angle = (i / 32) * Math.PI * 2;
          circlePoints.push([Math.cos(angle) * size, Math.sin(angle) * size, 0]);
        }
        return (
          <group position={[point[0], point[1], point[2] + 0.1]}>
            <Line points={circlePoints} color={color} lineWidth={lineWidth} />
            {/* Merkez noktası */}
            <mesh>
              <circleGeometry args={[size * 0.2, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        );
      case 'triangle':
        // MIDPOINT - Üçgen işaretçi
        const h = size * 1.2;
        return (
          <group position={[point[0], point[1], point[2] + 0.1]}>
            <Line
              points={[
                [0, h, 0], [-h * 0.866, -h * 0.5, 0],
                [-h * 0.866, -h * 0.5, 0], [h * 0.866, -h * 0.5, 0],
                [h * 0.866, -h * 0.5, 0], [0, h, 0]
              ]}
              color={color}
              lineWidth={lineWidth}
            />
          </group>
        );
      case 'cross':
        // INTERSECTION - Artı işaretçi
        return (
          <group position={[point[0], point[1], point[2] + 0.1]}>
            <Line points={[[-size, 0, 0], [size, 0, 0]]} color={color} lineWidth={lineWidth} />
            <Line points={[[0, -size, 0], [0, size, 0]]} color={color} lineWidth={lineWidth} />
            {/* Dış çizgiler */}
            <Line points={[[-size * 0.7, -size * 0.7, 0], [-size * 0.4, -size * 0.4, 0]]} color={color} lineWidth={2} />
            <Line points={[[size * 0.7, -size * 0.7, 0], [size * 0.4, -size * 0.4, 0]]} color={color} lineWidth={2} />
            <Line points={[[-size * 0.7, size * 0.7, 0], [-size * 0.4, size * 0.4, 0]]} color={color} lineWidth={2} />
            <Line points={[[size * 0.7, size * 0.7, 0], [size * 0.4, size * 0.4, 0]]} color={color} lineWidth={2} />
          </group>
        );
      case 'diamond':
        // QUADRANT - Elmas işaretçi
        return (
          <group position={[point[0], point[1], point[2] + 0.1]}>
            <Line
              points={[
                [0, size, 0], [size, 0, 0],
                [size, 0, 0], [0, -size, 0],
                [0, -size, 0], [-size, 0, 0],
                [-size, 0, 0], [0, size, 0]
              ]}
              color={color}
              lineWidth={lineWidth}
            />
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {renderMarker()}
      {/* Snap etiketi - mod adını göster */}
      <group position={[point[0] + size * 1.5, point[1] + size * 1.5, point[2] + 0.2]}>
        <mesh>
          <planeGeometry args={[size * 4, size * 1.5]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} />
        </mesh>
      </group>
    </>
  );
};

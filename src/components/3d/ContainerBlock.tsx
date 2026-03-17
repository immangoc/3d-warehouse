import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export type ContainerStatus = 'cold' | 'dry' | 'fragile' | 'other';

interface ContainerBlockProps {
  position: [number, number, number];
  status: ContainerStatus;
  id: string;
}

const statusColors: Record<ContainerStatus, string> = {
  cold: '#60A5FA',    // Kho Lạnh
  dry: '#F97316',     // Kho Khô
  fragile: '#EF4444', // Hàng hỏng/dễ vỡ
  other: '#9CA3AF',   // Khác
};

// Container dimensions based on standard 20ft/40ft proportions (simplified)
const WIDTH = 2.4;
const HEIGHT = 2.6;
const LENGTH = 6; 

export function ContainerBlock({ position, status, id }: ContainerBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Subtle breathing animation when hovered
  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 4) * 0.1;
    } else if (meshRef.current) {
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, position[1], 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false) }}
      >
        <boxGeometry args={[WIDTH, HEIGHT, LENGTH]} />
        <meshStandardMaterial 
            color={statusColors[status]} 
            emissive={hovered ? statusColors[status] : '#000000'}
            emissiveIntensity={hovered ? 0.3 : 0}
            roughness={0.7}
            metalness={0.2}
        />
      </mesh>
      
      {/* 2D HTML Tooltip on hover */}
      {hovered && (
        <Html 
            position={[0, HEIGHT/2 + 0.5, 0]} 
            center
            style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            minWidth: '150px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            pointerEvents: 'none',
            border: `1px solid ${statusColors[status]}`
          }}>
            <div style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '4px', marginBottom: '4px' }}>
                Container: {id}
            </div>
            <div style={{ color: '#666' }}>Type: {status.toUpperCase()}</div>
            <div style={{ color: '#666' }}>Weight: 2,400 kg</div>
          </div>
        </Html>
      )}
    </group>
  );
}

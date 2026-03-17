import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export type ContainerStatus = 'cold' | 'dry' | 'fragile' | 'other';

interface ContainerBlockProps {
  position: [number, number, number];
  status: ContainerStatus;
  id: string;
  zone?: string;
  floor?: number;
  slot?: string;
}

const statusColors: Record<ContainerStatus, string> = {
  cold:    '#60A5FA',
  dry:     '#F97316',
  fragile: '#EF4444',
  other:   '#9CA3AF',
};

const statusLabel: Record<ContainerStatus, string> = {
  cold:    'Hàng Lạnh',
  dry:     'Hàng Khô',
  fragile: 'Hàng dễ vỡ',
  other:   'Khác',
};

const WIDTH  = 2.4;
const HEIGHT = 2.6;
const LENGTH = 6;

export function ContainerBlock({ position, status, id, zone = 'A', floor = 3, slot = 'CT01' }: ContainerBlockProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 4) * 0.08;
    } else if (meshRef.current) {
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, position[1], 0.1);
    }
  });

  const color  = statusColors[status];
  const vLabel = `Zone ${zone}-kho ${statusLabel[status]}-tầng ${floor}-${slot}`;

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={(e)  => { e.stopPropagation(); setHovered(false); }}
      >
        <boxGeometry args={[WIDTH, HEIGHT, LENGTH]} />
        <meshStandardMaterial
          color={color}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.25 : 0}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {hovered && (
        <Html position={[0, HEIGHT / 2 + 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            padding: '14px 18px',
            width: '290px',
            fontFamily: 'Inter, -apple-system, sans-serif',
            pointerEvents: 'none',
          }}>
            {/* Icon */}
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#FFF7ED',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
            </div>

            {/* Info table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {[
                  { label: 'Mã số Container:', value: id, style: {} },
                  { label: 'Hãng tàu:', value: '', style: {} },
                  { label: 'Loại Container:', value: `20ft - ${statusLabel[status]}`, style: {} },
                  { label: 'Trạng thái:', value: 'Lưu kho', style: { color: '#F97316', fontWeight: '600' } },
                  { label: 'Vị trí:', value: vLabel, style: { fontWeight: '700', color: '#111827' } },
                  { label: 'Ngày nhập bãi:', value: '20/01/2026', style: {} },
                  { label: 'Thời gian lưu kho:', value: '2 tháng', style: {} },
                ].map(({ label, value, style }) => (
                  <tr key={label}>
                    <td style={{ color: '#6B7280', paddingBottom: '5px', paddingRight: '8px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      {label}
                    </td>
                    <td style={{ color: '#374151', paddingBottom: '5px', textAlign: 'right', ...style }}>
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Html>
      )}
    </group>
  );
}

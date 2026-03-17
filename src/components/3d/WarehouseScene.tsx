import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, Text } from '@react-three/drei';
import { ContainerStack } from './ContainerStack';

interface ZoneInfo {
  name: string;
  type: string;
  fillRate: number;
  emptySlots: number;
  totalSlots: number;
  recentContainers: string[];
}

const ZONE_DATA: Record<string, ZoneInfo> = {
  'Zone A': { name: 'Zone A', type: 'Kho Hàng Khô', fillRate: 80, emptySlots: 12, totalSlots: 72, recentContainers: ['CTN02442-', 'CTN4ry384-', 'CTN84295-'] },
  'Zone B': { name: 'Zone B', type: 'Kho Lạnh', fillRate: 65, emptySlots: 25, totalSlots: 60, recentContainers: ['CTN11230-', 'CTN55321-', 'CTN99012-'] },
  'Zone C': { name: 'Zone C', type: 'Kho Hàng dễ vỡ', fillRate: 45, emptySlots: 18, totalSlots: 36, recentContainers: ['CTN77810-', 'CTN34521-'] },
  'Zone D': { name: 'Zone D', type: 'Kho Khác', fillRate: 90, emptySlots: 5, totalSlots: 45, recentContainers: ['CTN22310-', 'CTN66741-', 'CTN88952-'] },
};

interface ClickableZoneGroupProps {
  position: [number, number, number];
  zoneName: string;
  rows: number;
  cols: number;
  levels: number;
  onZoneClick: (zone: ZoneInfo) => void;
}

function ClickableZoneGroup({ position, zoneName, rows, cols, levels, onZoneClick }: ClickableZoneGroupProps) {
  const WIDTH = 2.4;
  const LENGTH = 6.0;
  const GAP_X = 0.5;
  const GAP_Z = 0.5;
  const totalW = cols * (WIDTH + GAP_X) + 2;
  const totalL = rows * (LENGTH + GAP_Z) + 2;

  return (
    <group position={position}>
      <Text
        position={[0, 0.1, 10]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={2}
        color="#1E3A8A"
        fontWeight="bold"
      >
        {zoneName}
      </Text>

      {/* Invisible click surface covering the zone floor */}
      <mesh
        position={[(cols * (WIDTH + GAP_X)) / 2 - WIDTH / 2, 0.05, (rows * (LENGTH + GAP_Z)) / 2 - LENGTH / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onZoneClick(ZONE_DATA[zoneName]); }}
      >
        <planeGeometry args={[totalW, totalL]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      <ContainerStack position={[0, 0, 0]} rows={rows} cols={cols} levels={levels} />
    </group>
  );
}

interface WarehouseSceneProps {
  onZoneClick: (zone: ZoneInfo) => void;
}

export type { ZoneInfo };

export function WarehouseScene({ onZoneClick }: WarehouseSceneProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #dbe4f0, #f5f7fa)' }}>
      <Canvas shadows camera={{ position: [40, 30, 40], fov: 45 }}>
        <Suspense fallback={null}>
          <Environment preset="city" />

          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          <Grid
            infiniteGrid
            fadeDistance={100}
            sectionColor="#1E3A8A"
            cellColor="#A0AEC0"
            sectionSize={10}
            cellSize={2}
            position={[0, -0.01, 0]}
          />

          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={100} blur={2} far={10} />

          <ClickableZoneGroup position={[-20, 0, -20]} zoneName="Zone A" rows={3} cols={5} levels={4} onZoneClick={onZoneClick} />
          <ClickableZoneGroup position={[10, 0, -20]}  zoneName="Zone B" rows={4} cols={4} levels={3} onZoneClick={onZoneClick} />
          <ClickableZoneGroup position={[-20, 0, 10]}  zoneName="Zone C" rows={2} cols={6} levels={2} onZoneClick={onZoneClick} />
          <ClickableZoneGroup position={[15, 0, 15]}   zoneName="Zone D" rows={3} cols={3} levels={5} onZoneClick={onZoneClick} />

          <OrbitControls
            makeDefault
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={10}
            maxDistance={150}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

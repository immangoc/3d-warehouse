import { Suspense, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, Text } from '@react-three/drei';
import { ContainerStack, ZONE_WIDTH, ZONE_DEPTH } from './ContainerStack';
import type { ContainerStatus } from './ContainerBlock';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ZoneInfo {
  name: string;
  type: string;
  fillRate: number;
  emptySlots: number;
  totalSlots: number;
  recentContainers: string[];
}

export interface SceneHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

export type { ZoneInfo };

// ─── Zone data ────────────────────────────────────────────────────────────────
const ZONE_DATA: Record<string, ZoneInfo> = {
  'Kho Hàng Lạnh':   { name: 'Kho Hàng Lạnh',   type: 'cold',    fillRate: 65, emptySlots: 25, totalSlots: 72, recentContainers: ['CTN11230', 'CTN55321', 'CTN99012'] },
  'Kho Hàng Khô':    { name: 'Kho Hàng Khô',     type: 'dry',     fillRate: 80, emptySlots: 12, totalSlots: 72, recentContainers: ['CTN02442', 'CTN4ry384', 'CTN84295'] },
  'Kho Hàng Dễ Vỡ':  { name: 'Kho Hàng Dễ Vỡ',  type: 'fragile', fillRate: 45, emptySlots: 18, totalSlots: 36, recentContainers: ['CTN77810', 'CTN34521'] },
  'Kho Khác':         { name: 'Kho Khác',          type: 'other',   fillRate: 90, emptySlots: 5,  totalSlots: 45, recentContainers: ['CTN22310', 'CTN66741', 'CTN88952'] },
};

// ─── Section definitions ──────────────────────────────────────────────────────
interface SectionDef {
  id: string;
  name: string;
  warehouseType: ContainerStatus;
  row: number;  // 0 = top, 1 = bottom
  col: number;  // 0 = left, 1 = right
}

const SECTIONS: SectionDef[] = [
  { id: 'cold',    name: 'Kho Hàng Lạnh',   warehouseType: 'cold',    row: 0, col: 0 },
  { id: 'dry',     name: 'Kho Hàng Khô',    warehouseType: 'dry',     row: 0, col: 1 },
  { id: 'fragile', name: 'Kho Hàng Dễ Vỡ',  warehouseType: 'fragile', row: 1, col: 0 },
  { id: 'other',   name: 'Kho Khác',         warehouseType: 'other',   row: 1, col: 1 },
];

const ZONE_NAMES = ['Zone A', 'Zone B', 'Zone C'];
const ZONE_GAP = 3;       // gap between zones within a section
const SECTION_H_GAP = 15; // horizontal gap between section columns
const SECTION_V_GAP = 12; // vertical gap between section rows

// Section width = 3 zones side by side + gaps
const SECTION_WIDTH = 3 * ZONE_WIDTH + 2 * ZONE_GAP;
// Total storage area
const STORAGE_WIDTH = 2 * SECTION_WIDTH + SECTION_H_GAP;
const STORAGE_DEPTH = 2 * ZONE_DEPTH + SECTION_V_GAP;

// Section color accents for floor pads
const sectionAccentColors: Record<ContainerStatus, string> = {
  cold:    '#DBEAFE',
  dry:     '#FFF7ED',
  fragile: '#FEF9C3',
  other:   '#F3F4F6',
};

const sectionBorderColors: Record<ContainerStatus, string> = {
  cold:    '#3B82F6',
  dry:     '#F97316',
  fragile: '#EAB308',
  other:   '#6B7280',
};

// ─── Camera controls ──────────────────────────────────────────────────────────
const MIN_DIST = 15;
const MAX_DIST = 250;

function CameraControls({ handleRef }: { handleRef: React.MutableRefObject<SceneHandle | null> }) {
  const orbitRef = useRef<any>(null);
  const { camera } = useThree();

  handleRef.current = {
    zoomIn: () => {
      if (!orbitRef.current) return;
      const tgt = orbitRef.current.target;
      camera.position.sub(tgt).multiplyScalar(0.75);
      const dist = camera.position.length();
      if (dist < MIN_DIST) camera.position.setLength(MIN_DIST);
      camera.position.add(tgt);
      orbitRef.current.update();
    },
    zoomOut: () => {
      if (!orbitRef.current) return;
      const tgt = orbitRef.current.target;
      camera.position.sub(tgt).multiplyScalar(1.35);
      const dist = camera.position.length();
      if (dist > MAX_DIST) camera.position.setLength(MAX_DIST);
      camera.position.add(tgt);
      orbitRef.current.update();
    },
    resetView: () => {
      if (!orbitRef.current) return;
      camera.position.set(80, 60, 80);
      orbitRef.current.target.set(0, 0, 0);
      orbitRef.current.update();
    },
  };

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      maxPolarAngle={Math.PI / 2 - 0.05}
      minDistance={MIN_DIST}
      maxDistance={MAX_DIST}
    />
  );
}

// ─── Area label (Gate, Sorting) ───────────────────────────────────────────────
function AreaMarker({ position, label, width, depth, color }: {
  position: [number, number, number];
  label: string;
  width: number;
  depth: number;
  color: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>
      {/* Border */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width - 0.2, depth - 0.2]} />
        <meshStandardMaterial color={color} transparent opacity={0.0} wireframe />
      </mesh>
      <Text
        position={[0, 0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={2.5}
        color={color}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

// ─── Warehouse Section ────────────────────────────────────────────────────────
interface WarehouseSectionProps {
  section: SectionDef;
  originX: number;
  originZ: number;
  selectedId: string | null;
  onContainerClick: (id: string) => void;
  onSectionClick: (sectionName: string) => void;
}

function WarehouseSection({
  section, originX, originZ,
  selectedId, onContainerClick, onSectionClick,
}: WarehouseSectionProps) {
  const borderColor = sectionBorderColors[section.warehouseType];
  const accentColor = sectionAccentColors[section.warehouseType];

  return (
    <group position={[originX, 0, originZ]}>
      {/* Section floor pad */}
      <mesh
        position={[SECTION_WIDTH / 2, 0.015, ZONE_DEPTH / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onSectionClick(section.name); }}
      >
        <planeGeometry args={[SECTION_WIDTH + 2, ZONE_DEPTH + 2]} />
        <meshStandardMaterial color={accentColor} transparent opacity={0.5} />
      </mesh>

      {/* Section border lines */}
      <mesh position={[SECTION_WIDTH / 2, 0.025, ZONE_DEPTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0, 0, 0]} />
        <meshStandardMaterial color={borderColor} />
      </mesh>

      {/* Section name label */}
      <Text
        position={[SECTION_WIDTH / 2, 0.15, -3]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={2}
        color={borderColor}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        {section.name}
      </Text>

      {/* 3 zones (A, B, C) side by side along X */}
      {ZONE_NAMES.map((zoneName, idx) => {
        const zoneX = idx * (ZONE_WIDTH + ZONE_GAP);
        return (
          <group key={zoneName} position={[zoneX, 0, 0]}>
            {/* Zone label */}
            <Text
              position={[ZONE_WIDTH / 2, 0.1, -1.5]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1.2}
              color="#1E3A8A"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
            >
              {zoneName}
            </Text>

            <ContainerStack
              position={[0, 0, 0]}
              warehouseType={section.warehouseType}
              zoneName={`${zoneName}-${section.id}`}
              selectedId={selectedId}
              onContainerClick={onContainerClick}
            />
          </group>
        );
      })}
    </group>
  );
}

// ─── WarehouseScene (forwardRef) ──────────────────────────────────────────────
interface WarehouseSceneProps {
  onZoneClick: (zone: ZoneInfo) => void;
}

export const WarehouseScene = forwardRef<SceneHandle, WarehouseSceneProps>(
  ({ onZoneClick }, ref) => {
    const handleRef = useRef<SceneHandle | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      zoomIn:    () => handleRef.current?.zoomIn(),
      zoomOut:   () => handleRef.current?.zoomOut(),
      resetView: () => handleRef.current?.resetView(),
    }), []);

    function handleContainerClick(id: string) {
      setSelectedId((prev) => (prev === id ? null : id));
    }

    function handleSectionClick(sectionName: string) {
      const zone = ZONE_DATA[sectionName];
      if (zone) onZoneClick(zone);
    }

    function handleBackgroundClick() {
      setSelectedId(null);
    }

    // Compute section positions centered at origin
    const offsetX = -STORAGE_WIDTH / 2;
    const offsetZ = -STORAGE_DEPTH / 2;

    return (
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #dbe4f0, #f5f7fa)' }}>
        <Canvas shadows camera={{ position: [80, 60, 80], fov: 45 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />

            <ambientLight intensity={0.5} />
            <directionalLight
              position={[20, 40, 20]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />

            <Grid
              infiniteGrid
              fadeDistance={200}
              sectionColor="#1E3A8A"
              cellColor="#A0AEC0"
              sectionSize={10}
              cellSize={2}
              position={[0, -0.01, 0]}
            />

            <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={200} blur={2} far={15} />

            {/* Background click catcher */}
            <mesh
              position={[0, -0.05, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={handleBackgroundClick}
            >
              <planeGeometry args={[500, 500]} />
              <meshStandardMaterial transparent opacity={0} />
            </mesh>

            {/* Gate In */}
            <AreaMarker
              position={[0, 0, offsetZ + STORAGE_DEPTH + 12]}
              label="CỔNG NHẬP"
              width={STORAGE_WIDTH * 0.5}
              depth={6}
              color="#16A34A"
            />

            {/* Sorting Area */}
            <AreaMarker
              position={[0, 0, offsetZ + STORAGE_DEPTH + 5]}
              label="KHU PHÂN LOẠI"
              width={STORAGE_WIDTH * 0.7}
              depth={4}
              color="#7C3AED"
            />

            {/* Gate Out */}
            <AreaMarker
              position={[0, 0, offsetZ - 8]}
              label="CỔNG XUẤT"
              width={STORAGE_WIDTH * 0.5}
              depth={6}
              color="#DC2626"
            />

            {/* Storage area label */}
            <Text
              position={[0, 0.2, offsetZ - 3]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={2}
              color="#1E3A8A"
              fontWeight="bold"
              anchorX="center"
            >
              KHU LƯU TRỮ
            </Text>

            {/* 4 Warehouse Sections in 2×2 grid */}
            {SECTIONS.map((section) => {
              const sx = offsetX + section.col * (SECTION_WIDTH + SECTION_H_GAP);
              const sz = offsetZ + section.row * (ZONE_DEPTH + SECTION_V_GAP);
              return (
                <WarehouseSection
                  key={section.id}
                  section={section}
                  originX={sx}
                  originZ={sz}
                  selectedId={selectedId}
                  onContainerClick={handleContainerClick}
                  onSectionClick={handleSectionClick}
                />
              );
            })}

            <CameraControls handleRef={handleRef} />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

WarehouseScene.displayName = 'WarehouseScene';

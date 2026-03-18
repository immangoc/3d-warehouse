import { Suspense, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text } from '@react-three/drei';
import { ContainerBlock } from './ContainerBlock';
import type { ContainerStatus } from './ContainerBlock';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ZoneInfo {
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

// ─── Warehouse config ────────────────────────────────────────────────────────
export type WHType = 'cold' | 'dry' | 'fragile' | 'other';

interface WHConfig {
  name: string;
  status: ContainerStatus;
  color: string;
  plateColor: string;
  recentContainers: string[];
}

export const WH_CONFIG: Record<WHType, WHConfig> = {
  cold:    { name: 'Kho Lạnh',       status: 'cold',    color: '#3B82F6', plateColor: '#BFDBFE', recentContainers: ['CTN11230', 'CTN55321', 'CTN99012'] },
  dry:     { name: 'Kho Khô',        status: 'dry',     color: '#F97316', plateColor: '#FDBA74', recentContainers: ['CTN02442', 'CTN4ry384', 'CTN84295'] },
  fragile: { name: 'Kho Hàng dễ vỡ', status: 'fragile', color: '#EF4444', plateColor: '#FECACA', recentContainers: ['CTN77810', 'CTN34521'] },
  other:   { name: 'Kho khác',       status: 'other',   color: '#9CA3AF', plateColor: '#D1D5DB', recentContainers: ['CTN22310', 'CTN66741', 'CTN88952'] },
};

// ─── Grid generation (same as 2D) ───────────────────────────────────────────
const ZONES = ['Zone A', 'Zone B', 'Zone C'];

function makeGrid(seed: number): boolean[][] {
  const rows = 4, cols = 8;
  const sr = (n: number) => {
    const x = Math.sin(n + seed) * 10000;
    return x - Math.floor(x);
  };
  let idx = 0;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, c) => {
      const isLeft = c < 4;
      const rate = isLeft
        ? 0.97
        : Math.max(0, 0.88 - Math.floor((c - 4) / 2) * (seed * 0.15 + 0.06));
      return sr(idx++) < rate;
    })
  );
}

const GRID_CACHE: Record<string, boolean[][]> = {};
function getGrid(whId: string, zone: string): boolean[][] {
  const key = `${whId}-${zone}`;
  if (!GRID_CACHE[key]) {
    const seeds: Record<string, number> = { cold: 2.1, dry: 3.5, fragile: 5.7, other: 7.2 };
    const zoneSeed = ZONES.indexOf(zone) * 0.8;
    GRID_CACHE[key] = makeGrid((seeds[whId] ?? 1) + zoneSeed);
  }
  return GRID_CACHE[key];
}

// ─── 3D Dimensions ───────────────────────────────────────────────────────────
const CTN_W = 2.4;
const CTN_H = 2.6;
const CTN_L20 = 6.0;
const GAP = 0.5;
const RACK_GAP = 1.2;
const BLOCK_GAP = 3.0;
const ROW_GROUP_GAP = 2.5;

function colX(col: number): number {
  if (col < 2) return col * (CTN_W + GAP);
  if (col < 4) return (col - 2) * (CTN_W + GAP) + 2 * (CTN_W + GAP) + RACK_GAP;
  if (col < 6) return (col - 4) * (CTN_W + GAP) + 4 * (CTN_W + GAP) + RACK_GAP + BLOCK_GAP;
  return (col - 6) * (CTN_W + GAP) + 6 * (CTN_W + GAP) + RACK_GAP + BLOCK_GAP + RACK_GAP;
}

function rowZ(row: number): number {
  return row * (CTN_L20 + GAP) + (row >= 2 ? ROW_GROUP_GAP : 0);
}

const TOTAL_X = colX(7) + CTN_W;
const TOTAL_Z = rowZ(3) + CTN_L20;

// ─── Zone block ──────────────────────────────────────────────────────────────
interface ZoneBlockProps {
  position: [number, number, number];
  zoneName: string;
  whType: WHType;
  onClick: () => void;
}

function ZoneBlock({ position, zoneName, whType, onClick }: ZoneBlockProps) {
  const wh = WH_CONFIG[whType];
  const grid = useMemo(() => getGrid(whType, zoneName), [whType, zoneName]);

  const containers = useMemo(() => {
    const items: {
      key: string;
      pos: [number, number, number];
      sizeType: '20ft' | '40ft';
      id: string;
      floor: number;
      slot: string;
      colorSeed: number;
    }[] = [];

    const maxLevels = 3;
    const sr = (n: number) => {
      const x = Math.sin(n * 31.7 + ZONES.indexOf(zoneName) * 7.3) * 43758.5453;
      return x - Math.floor(x);
    };

    // Track which slots are filled per level (containers can only stack on top of existing ones)
    const filled20: Set<string>[] = [new Set(), new Set(), new Set()];
    const filled40: Set<string>[] = [new Set(), new Set(), new Set()];

    for (let level = 0; level < maxLevels; level++) {
      const fillRate = level === 0 ? 1.0 : level === 1 ? 0.6 : 0.3;

      // 20ft containers (cols 0-3)
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const slotKey = `${row}-${col}`;
          if (!grid[row][col]) continue;
          // Level 0: place based on grid. Level 1+: MUST have container below, then random check
          if (level > 0 && !filled20[level - 1].has(slotKey)) continue;
          if (level > 0 && sr(level * 100 + row * 10 + col) > fillRate) continue;

          filled20[level].add(slotKey);
          items.push({
            key: `20-${level}-${row}-${col}`,
            pos: [colX(col), level * CTN_H + CTN_H / 2, rowZ(row)],
            sizeType: '20ft',
            id: `CTN-${whType.charAt(0).toUpperCase()}${level}${row}${col}`,
            floor: level + 1,
            slot: `R${row + 1}C${col + 1}`,
            colorSeed: level * 1000 + row * 100 + col * 10 + ZONES.indexOf(zoneName) * 3,
          });
        }
      }

      // 40ft containers (cols 4-7, each spans 2 rows)
      for (let groupIdx = 0; groupIdx < 2; groupIdx++) {
        const baseRow = groupIdx * 2;
        for (let col = 4; col < 8; col++) {
          const slotKey = `${groupIdx}-${col}`;
          if (!grid[baseRow][col]) continue;
          // Must have container below to stack
          if (level > 0 && !filled40[level - 1].has(slotKey)) continue;
          if (level > 0 && sr(level * 200 + groupIdx * 50 + col) > fillRate) continue;

          filled40[level].add(slotKey);
          const z0 = rowZ(baseRow);
          const z1 = rowZ(baseRow + 1);

          items.push({
            key: `40-${level}-${groupIdx}-${col}`,
            pos: [colX(col), level * CTN_H + CTN_H / 2, (z0 + z1) / 2],
            sizeType: '40ft',
            id: `CTN-${whType.charAt(0).toUpperCase()}${level}${groupIdx}${col}`,
            floor: level + 1,
            slot: `R${baseRow + 1}-${baseRow + 2}C${col + 1}`,
            colorSeed: level * 1000 + groupIdx * 200 + col * 10 + 5 + ZONES.indexOf(zoneName) * 3,
          });
        }
      }
    }

    return items;
  }, [grid, whType, zoneName]);

  const centerX = TOTAL_X / 2;
  const centerZ = TOTAL_Z / 2;

  return (
    <group position={position}>
      {/* Ground plate border */}
      <mesh position={[centerX, 0.01, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TOTAL_X + 3.5, TOTAL_Z + 3.5]} />
        <meshStandardMaterial color={wh.color} transparent opacity={0.12} />
      </mesh>

      {/* Ground plate fill */}
      <mesh
        position={[centerX, 0.02, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <planeGeometry args={[TOTAL_X + 3, TOTAL_Z + 3]} />
        <meshStandardMaterial color={wh.plateColor} transparent opacity={0.55} />
      </mesh>

      {/* Zone label */}
      <Text
        position={[centerX, 0.1, TOTAL_Z + 3.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={2.2}
        color={wh.color}
        fontWeight="bold"
        anchorX="center"
      >
        {zoneName.replace('Zone ', '')}
      </Text>

      {/* Section labels */}
      <Text
        position={[5.5, 0.1, -2.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.9}
        color="#9CA3AF"
        anchorX="center"
      >
        20ft
      </Text>
      <Text
        position={[TOTAL_X - 5.5, 0.1, -2.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.9}
        color="#9CA3AF"
        anchorX="center"
      >
        40ft
      </Text>

      {/* Container blocks */}
      {containers.map((ctn) => (
        <ContainerBlock
          key={ctn.key}
          id={ctn.id}
          position={ctn.pos}
          status={wh.status}
          sizeType={ctn.sizeType}
          colorSeed={ctn.colorSeed}
          zone={zoneName.replace('Zone ', '')}
          floor={ctn.floor}
          slot={ctn.slot}
        />
      ))}
    </group>
  );
}

// ─── Camera controls ─────────────────────────────────────────────────────────
const MIN_DIST = 15;
const MAX_DIST = 200;

function CameraControls({ handleRef }: { handleRef: React.MutableRefObject<SceneHandle | null> }) {
  const orbitRef = useRef<any>(null);
  const { camera } = useThree();

  handleRef.current = {
    zoomIn: () => {
      if (!orbitRef.current) return;
      const tgt = orbitRef.current.target;
      camera.position.sub(tgt).multiplyScalar(0.75);
      if (camera.position.length() < MIN_DIST) camera.position.setLength(MIN_DIST);
      camera.position.add(tgt);
      orbitRef.current.update();
    },
    zoomOut: () => {
      if (!orbitRef.current) return;
      const tgt = orbitRef.current.target;
      camera.position.sub(tgt).multiplyScalar(1.35);
      if (camera.position.length() > MAX_DIST) camera.position.setLength(MAX_DIST);
      camera.position.add(tgt);
      orbitRef.current.update();
    },
    resetView: () => {
      if (!orbitRef.current) return;
      // Center of 3 zones: X = ZONE_SPACING + TOTAL_X/2, Z = TOTAL_Z/2
      const cx = ZONE_SPACING + TOTAL_X / 2;
      const cz = TOTAL_Z / 2;
      camera.position.set(cx, 45, cz + 55);
      orbitRef.current.target.set(cx, 0, cz);
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

// ─── WarehouseScene ──────────────────────────────────────────────────────────
interface WarehouseSceneProps {
  warehouseType: WHType;
  onZoneClick: (zone: ZoneInfo) => void;
}

const ZONE_SPACING = 34;

export const WarehouseScene = forwardRef<SceneHandle, WarehouseSceneProps>(
  ({ warehouseType, onZoneClick }, ref) => {
    const handleRef = useRef<SceneHandle | null>(null);

    useImperativeHandle(ref, () => ({
      zoomIn:    () => handleRef.current?.zoomIn(),
      zoomOut:   () => handleRef.current?.zoomOut(),
      resetView: () => handleRef.current?.resetView(),
    }), []);

    function handleZoneClick(zoneName: string) {
      const wh = WH_CONFIG[warehouseType];
      const grid = getGrid(warehouseType, zoneName);
      const totalSlots = 32;
      const filledSlots = grid.flat().filter(Boolean).length;

      onZoneClick({
        name: zoneName,
        type: wh.name,
        fillRate: Math.round((filledSlots / totalSlots) * 100),
        emptySlots: totalSlots - filledSlots,
        totalSlots,
        recentContainers: wh.recentContainers,
      });
    }

    return (
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #dbe4f0, #f5f7fa)' }}>
        <Canvas shadows camera={{ position: [ZONE_SPACING + TOTAL_X / 2, 45, TOTAL_Z / 2 + 55], fov: 45 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[30, 35, 25]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />

            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ZONE_SPACING + TOTAL_X / 2, -0.02, TOTAL_Z / 2]}>
              <planeGeometry args={[140, 60]} />
              <meshStandardMaterial color="#F1F5F9" />
            </mesh>

            <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={140} blur={2} far={10} />

            {/* 3 zones arranged horizontally */}
            {ZONES.map((zone, i) => (
              <ZoneBlock
                key={`${warehouseType}-${zone}`}
                position={[i * ZONE_SPACING, 0, 0]}
                zoneName={zone}
                whType={warehouseType}
                onClick={() => handleZoneClick(zone)}
              />
            ))}

            <CameraControls handleRef={handleRef} />
          </Suspense>
        </Canvas>
      </div>
    );
  }
);

WarehouseScene.displayName = 'WarehouseScene';

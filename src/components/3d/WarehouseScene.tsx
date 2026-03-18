import { Suspense, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Text, RoundedBox } from '@react-three/drei';
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

// ─── Warehouse config (matching 2D) ──────────────────────────────────────────
type WHType = 'cold' | 'dry' | 'fragile' | 'other';

interface WHConfig {
  id: WHType;
  status: ContainerStatus;
  name: string;
  color: string;
  plateColor: string;
  fillRate: number;
  emptySlots: number;
  totalSlots: number;
  recentContainers: string[];
}

const WAREHOUSES: WHConfig[] = [
  { id: 'cold',    status: 'cold',    name: 'Kho Lạnh',       color: '#3B82F6', plateColor: '#DBEAFE', fillRate: 65, emptySlots: 25, totalSlots: 60, recentContainers: ['CTN11230', 'CTN55321', 'CTN99012'] },
  { id: 'dry',     status: 'dry',     name: 'Kho Khô',        color: '#F97316', plateColor: '#FED7AA', fillRate: 80, emptySlots: 12, totalSlots: 72, recentContainers: ['CTN02442', 'CTN4ry384', 'CTN84295'] },
  { id: 'fragile', status: 'fragile', name: 'Kho Hàng dễ vỡ', color: '#EF4444', plateColor: '#FECACA', fillRate: 45, emptySlots: 18, totalSlots: 36, recentContainers: ['CTN77810', 'CTN34521'] },
  { id: 'other',   status: 'other',   name: 'Kho khác',       color: '#9CA3AF', plateColor: '#E5E7EB', fillRate: 90, emptySlots: 5,  totalSlots: 45, recentContainers: ['CTN22310', 'CTN66741', 'CTN88952'] },
];

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

// ─── Grid generation (same as 2D) ───────────────────────────────────────────
function makeGrid(seed: number): boolean[][] {
  const rows = 4, cols = 8;
  const seededRandom = (n: number) => {
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
      return seededRandom(idx++) < rate;
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
const CTN_W = 2.4;       // container width (X)
const CTN_H = 2.6;       // container height (Y)
const CTN_L20 = 6.0;     // 20ft container length (Z)
const CTN_L40 = 12.5;    // 40ft container length (Z)
const GAP = 0.5;          // gap between containers
const RACK_GAP = 1.2;     // gap between rack pairs
const BLOCK_GAP = 3.0;    // gap between 20ft and 40ft blocks
const ROW_GROUP_GAP = 2.5; // gap between row groups

// ─── Single warehouse block (3D grid matching 2D) ───────────────────────────
interface WarehouseBlockProps {
  position: [number, number, number];
  wh: WHConfig;
  zone: string;
  levels: number;
  onClick: () => void;
}

function WarehouseBlock({ position, wh, zone, levels, onClick }: WarehouseBlockProps) {
  const grid = useMemo(() => getGrid(wh.id, zone), [wh.id, zone]);

  // Calculate positions for each container in the grid
  const containers = useMemo(() => {
    const items: {
      key: string;
      pos: [number, number, number];
      sizeType: '20ft' | '40ft';
      id: string;
      floor: number;
      slot: string;
    }[] = [];

    const maxLevels = Math.min(levels, 3);

    // X positions for each column
    // Left block (20ft): cols 0-3, in rack pairs [0,1] and [2,3]
    // Right block (40ft): cols 4-7, in rack pairs [4,5] and [6,7]
    function colX(col: number): number {
      if (col < 2) {
        return col * (CTN_W + GAP);
      } else if (col < 4) {
        return (col - 2) * (CTN_W + GAP) + 2 * (CTN_W + GAP) + RACK_GAP;
      } else if (col < 6) {
        return (col - 4) * (CTN_W + GAP) + 4 * (CTN_W + GAP) + RACK_GAP + BLOCK_GAP;
      } else {
        return (col - 6) * (CTN_W + GAP) + 6 * (CTN_W + GAP) + RACK_GAP + BLOCK_GAP + RACK_GAP;
      }
    }

    // Z positions for each row
    // 2 row groups: rows [0,1] and [2,3]
    function rowZ(row: number): number {
      const groupOffset = row >= 2 ? ROW_GROUP_GAP : 0;
      return row * (CTN_L20 + GAP) + groupOffset;
    }

    // Seeded random for level filling
    const sr = (n: number) => {
      const x = Math.sin(n + (ZONES.indexOf(zone) + 1) * 7.3) * 10000;
      return x - Math.floor(x);
    };

    for (let level = 0; level < maxLevels; level++) {
      // 20ft containers (cols 0-3)
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const filled = grid[row][col];
          // Higher levels have fewer containers
          const levelFill = level === 0 ? 1.0 : level === 1 ? 0.6 : 0.3;
          if (!filled || (level > 0 && sr(level * 100 + row * 10 + col) > levelFill)) continue;

          const x = colX(col);
          const y = level * CTN_H + CTN_H / 2;
          const z = rowZ(row);
          const slot = `R${row + 1}C${col + 1}`;

          items.push({
            key: `${wh.id}-${zone}-20-${level}-${row}-${col}`,
            pos: [x, y, z],
            sizeType: '20ft',
            id: `CTN-${wh.id.charAt(0).toUpperCase()}${level}${row}${col}`,
            floor: level + 1,
            slot,
          });
        }
      }

      // 40ft containers (cols 4-7)
      // In 2D, 40ft containers span 2 rows vertically
      // So for each row group (0-1 and 2-3), we place 40ft containers
      for (let groupIdx = 0; groupIdx < 2; groupIdx++) {
        const baseRow = groupIdx * 2;
        for (let col = 4; col < 8; col++) {
          const filled = grid[baseRow][col];
          const levelFill = level === 0 ? 1.0 : level === 1 ? 0.5 : 0.2;
          if (!filled || (level > 0 && sr(level * 200 + groupIdx * 50 + col) > levelFill)) continue;

          const x = colX(col);
          const y = level * CTN_H + CTN_H / 2;
          // Center the 40ft container between the two rows
          const z0 = rowZ(baseRow);
          const z1 = rowZ(baseRow + 1);
          const z = (z0 + z1) / 2;
          const slot = `R${baseRow + 1}-${baseRow + 2}C${col + 1}`;

          items.push({
            key: `${wh.id}-${zone}-40-${level}-${groupIdx}-${col}`,
            pos: [x, y, z],
            sizeType: '40ft',
            id: `CTN-${wh.id.charAt(0).toUpperCase()}${level}${groupIdx}${col}`,
            floor: level + 1,
            slot,
          });
        }
      }
    }

    return items;
  }, [grid, wh.id, zone, levels]);

  // Ground plate dimensions
  const totalX = useMemo(() => {
    // 8 columns worth of containers + gaps
    const last = (col: number) => {
      if (col < 2) return col * (CTN_W + GAP);
      if (col < 4) return (col - 2) * (CTN_W + GAP) + 2 * (CTN_W + GAP) + RACK_GAP;
      if (col < 6) return (col - 4) * (CTN_W + GAP) + 4 * (CTN_W + GAP) + RACK_GAP + BLOCK_GAP;
      return (col - 6) * (CTN_W + GAP) + 6 * (CTN_W + GAP) + RACK_GAP + BLOCK_GAP + RACK_GAP;
    };
    return last(7) + CTN_W;
  }, []);

  const totalZ = useMemo(() => {
    return 3 * (CTN_L20 + GAP) + CTN_L20 + ROW_GROUP_GAP;
  }, []);

  const centerX = totalX / 2;
  const centerZ = totalZ / 2;

  return (
    <group position={position}>
      {/* Ground plate */}
      <mesh
        position={[centerX, 0.02, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <planeGeometry args={[totalX + 3, totalZ + 3]} />
        <meshStandardMaterial color={wh.plateColor} transparent opacity={0.5} />
      </mesh>

      {/* Border outline */}
      <mesh position={[centerX, 0.03, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[totalX + 3.2, totalZ + 3.2]} />
        <meshStandardMaterial color={wh.color} transparent opacity={0.15} />
      </mesh>

      {/* Warehouse label */}
      <Text
        position={[centerX, 0.1, -2.5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.8}
        color={wh.color}
        fontWeight="bold"
        anchorX="center"
      >
        {wh.name}
      </Text>

      {/* Zone label */}
      <Text
        position={[centerX, 0.1, -0.8]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.0}
        color="#6B7280"
        anchorX="center"
      >
        {zone}
      </Text>

      {/* Section labels */}
      <Text
        position={[5.5, 0.1, totalZ + 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#9CA3AF"
        anchorX="center"
      >
        20ft
      </Text>
      <Text
        position={[totalX - 5.5, 0.1, totalZ + 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
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
          zone={zone.replace('Zone ', '')}
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
      camera.position.set(50, 45, 65);
      orbitRef.current.target.set(25, 0, 15);
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
  onZoneClick: (zone: ZoneInfo) => void;
}

export const WarehouseScene = forwardRef<SceneHandle, WarehouseSceneProps>(
  ({ onZoneClick }, ref) => {
    const handleRef = useRef<SceneHandle | null>(null);

    useImperativeHandle(ref, () => ({
      zoomIn:    () => handleRef.current?.zoomIn(),
      zoomOut:   () => handleRef.current?.zoomOut(),
      resetView: () => handleRef.current?.resetView(),
    }), []);

    // 2×2 warehouse grid positions
    const WH_SPACING_X = 38;
    const WH_SPACING_Z = 35;
    const whPositions: [number, number, number][] = [
      [0, 0, 0],                            // Cold (top-left)
      [WH_SPACING_X, 0, 0],                 // Dry (top-right)
      [0, 0, WH_SPACING_Z],                 // Fragile (bottom-left)
      [WH_SPACING_X, 0, WH_SPACING_Z],      // Other (bottom-right)
    ];

    function handleWhClick(wh: WHConfig) {
      onZoneClick({
        name: wh.name,
        type: wh.name,
        fillRate: wh.fillRate,
        emptySlots: wh.emptySlots,
        totalSlots: wh.totalSlots,
        recentContainers: wh.recentContainers,
      });
    }

    return (
      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(to bottom, #dbe4f0, #f5f7fa)' }}>
        <Canvas shadows camera={{ position: [50, 45, 65], fov: 45 }}>
          <Suspense fallback={null}>
            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[20, 30, 20]}
              intensity={1.5}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />

            {/* Ground grid */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[30, -0.01, 25]}>
              <planeGeometry args={[120, 100]} />
              <meshStandardMaterial color="#F1F5F9" />
            </mesh>

            <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={120} blur={2} far={10} />

            {/* 4 warehouse blocks in 2×2 grid */}
            {WAREHOUSES.map((wh, i) => (
              <WarehouseBlock
                key={wh.id}
                position={whPositions[i]}
                wh={wh}
                zone="Zone A"
                levels={3}
                onClick={() => handleWhClick(wh)}
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

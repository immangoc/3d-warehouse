import { useMemo } from 'react';
import { ContainerBlock } from './ContainerBlock';
import type { ContainerStatus, ContainerSize } from './ContainerBlock';

interface StackItem {
  id: string;
  status: ContainerStatus;
  sizeType: ContainerSize;
  position: [number, number, number];
  floor: number;
  slot: string;
}

interface ContainerStackProps {
  position: [number, number, number];
  warehouseType: ContainerStatus;
  zoneName: string;
  selectedId?: string | null;
  onContainerClick?: (id: string) => void;
}

// Real-world dimensions (meters)
const W  = 2.44;   // container width
const H  = 2.59;   // container height
const L20 = 6.06;  // 20ft container length
const L40 = 12.2;  // 40ft container length
const GAP = 0.4;   // gap between containers
const AISLE = 1.5; // aisle between 20ft and 40ft sections

// Layout: Left = 2 cols × 4 rows of 20ft, Right = 1 col × 4 rows of 40ft
const COLS_20FT = 2;
const ROWS_20FT = 4;
const COLS_40FT = 1;
const ROWS_40FT = 4;
const MAX_LEVELS = 3;

// Deterministic pseudo-random based on seed
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function ContainerStack({
  position, warehouseType, zoneName,
  selectedId, onContainerClick,
}: ContainerStackProps) {
  const containers = useMemo(() => {
    const items: StackItem[] = [];
    // Create seed from zone name for deterministic layout
    let seed = 0;
    for (let i = 0; i < zoneName.length; i++) seed += zoneName.charCodeAt(i) * (i + 1);
    seed += warehouseType.charCodeAt(0) * 100;
    const rand = seededRandom(seed);

    // --- 20ft containers (left side) ---
    for (let level = 0; level < MAX_LEVELS; level++) {
      for (let row = 0; row < ROWS_20FT; row++) {
        for (let col = 0; col < COLS_20FT; col++) {
          // ~15% empty on level 0, more empty on higher levels
          const emptyChance = level === 0 ? 0.1 : level === 1 ? 0.25 : 0.4;
          if (rand() < emptyChance) continue;

          const x = col * (W + GAP);
          const y = level * H + H / 2;
          const z = row * (L20 + GAP);
          const slotId = `${String.fromCharCode(65 + col)}${row + 1}`;
          const id = `CTN-${zoneName.replace(' ', '')}-${slotId}-L${level + 1}-${((rand() * 9000 + 1000) | 0)}`;

          items.push({
            id,
            status: warehouseType,
            sizeType: '20ft',
            position: [x, y, z],
            floor: level + 1,
            slot: slotId,
          });
        }
      }
    }

    // --- 40ft containers (right side) ---
    const x40 = COLS_20FT * (W + GAP) + AISLE;
    for (let level = 0; level < MAX_LEVELS; level++) {
      for (let row = 0; row < ROWS_40FT; row++) {
        const emptyChance = level === 0 ? 0.1 : level === 1 ? 0.3 : 0.45;
        if (rand() < emptyChance) continue;

        const y = level * H + H / 2;
        const z = row * (L40 + GAP);
        const slotId = `F${row + 1}`;
        const id = `CTN-${zoneName.replace(' ', '')}-${slotId}-L${level + 1}-${((rand() * 9000 + 1000) | 0)}`;

        items.push({
          id,
          status: warehouseType,
          sizeType: '40ft',
          position: [x40, y, z],
          floor: level + 1,
          slot: slotId,
        });
      }
    }

    return items;
  }, [warehouseType, zoneName]);

  // Compute zone dimensions for base pad
  const zoneWidth = COLS_20FT * (W + GAP) + AISLE + COLS_40FT * (W + GAP);
  const zoneDepth40 = ROWS_40FT * (L40 + GAP);
  const zoneDepth20 = ROWS_20FT * (L20 + GAP);
  const zoneDepth = Math.max(zoneDepth20, zoneDepth40);

  return (
    <group position={position}>
      {/* Zone base pad */}
      <mesh
        position={[zoneWidth / 2 - W / 2, 0.01, zoneDepth / 2 - L20 / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[zoneWidth + 1, zoneDepth + 1]} />
        <meshStandardMaterial color="#E2E8F0" transparent opacity={0.4} />
      </mesh>

      {containers.map((ctn) => (
        <ContainerBlock
          key={ctn.id}
          id={ctn.id}
          position={ctn.position}
          status={ctn.status}
          sizeType={ctn.sizeType}
          zone={zoneName}
          floor={ctn.floor}
          slot={ctn.slot}
          selected={selectedId === ctn.id}
          onClick={onContainerClick}
        />
      ))}
    </group>
  );
}

// Export dimensions for use in scene layout
export const ZONE_WIDTH = COLS_20FT * (W + GAP) + AISLE + COLS_40FT * (W + GAP);
export const ZONE_DEPTH_20 = ROWS_20FT * (L20 + GAP);
export const ZONE_DEPTH_40 = ROWS_40FT * (L40 + GAP);
export const ZONE_DEPTH = Math.max(ZONE_DEPTH_20, ZONE_DEPTH_40);

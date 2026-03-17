import { ContainerBlock } from './ContainerBlock';
import type { ContainerStatus } from './ContainerBlock';

interface StackData {
  id: string;
  status: ContainerStatus;
  position: [number, number, number];
}

interface ContainerStackProps {
  position: [number, number, number];
  rows: number;
  cols: number;
  levels: number;
}

export function ContainerStack({ position, rows, cols, levels }: ContainerStackProps) {
  const containers: StackData[] = [];
  
  // Container dimensions + gaps
  const WIDTH = 2.4;
  const HEIGHT = 2.6;
  const LENGTH = 6.0;
  const GAP_X = 0.5;
  const GAP_Z = 0.5;
  
  const statuses: ContainerStatus[] = ['cold', 'dry', 'fragile', 'other'];

  for (let l = 0; l < levels; l++) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Randomly skip some containers to make it look realistic (not 100% full)
        if (Math.random() > 0.8) continue;

        const x = c * (WIDTH + GAP_X);
        const y = l * HEIGHT + HEIGHT/2; 
        const z = r * (LENGTH + GAP_Z);

        // Randomly assign a status
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        containers.push({
          id: `CTN-${r}${c}${l}-${Math.floor(Math.random()*1000)}`,
          status,
          position: [x, y, z]
        });
      }
    }
  }

  return (
    <group position={position}>
      {/* Optional: Add a subtle base pad for the stack area */}
      <mesh position={[(cols*(WIDTH+GAP_X))/2 - WIDTH/2, 0.01, (rows*(LENGTH+GAP_Z))/2 - LENGTH/2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cols * (WIDTH + GAP_X) + 1, rows * (LENGTH + GAP_Z) + 1]} />
        <meshStandardMaterial color="#E2E8F0" transparent opacity={0.5} />
      </mesh>

      {containers.map((ctn) => (
        <ContainerBlock 
          key={ctn.id} 
          id={ctn.id} 
          position={ctn.position} 
          status={ctn.status} 
        />
      ))}
    </group>
  );
}

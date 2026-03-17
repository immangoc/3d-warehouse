import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, Text } from '@react-three/drei';
import { ContainerStack } from './ContainerStack';

export function WarehouseScene() {
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

          {/* Warehouse Floor */}
          <Grid 
            infiniteGrid 
            fadeDistance={100} 
            sectionColor="#1E3A8A" 
            cellColor="#A0AEC0" 
            sectionSize={10} 
            cellSize={2} 
            position={[0, -0.01, 0]}
          />
          
          {/* Subtle shadows under objects */}
          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={100} blur={2} far={10} />

          {/* Render 4 distinct Warehouse Zones based on the design (Kho A, B, v.v) */}
          <group position={[-20, 0, -20]}>
            <Text position={[0, 0.1, 10]} rotation={[-Math.PI / 2, 0, 0]} fontSize={2} color="#1E3A8A" fontWeight="bold">ZONE A</Text>
            <ContainerStack position={[0, 0, 0]} rows={3} cols={5} levels={4} />
          </group>

          <group position={[10, 0, -20]}>
            <Text position={[0, 0.1, 10]} rotation={[-Math.PI / 2, 0, 0]} fontSize={2} color="#1E3A8A" fontWeight="bold">ZONE B</Text>
            <ContainerStack position={[0, 0, 0]} rows={4} cols={4} levels={3} />
          </group>
          
          <group position={[-20, 0, 10]}>
            <Text position={[0, 0.1, 8]} rotation={[-Math.PI / 2, 0, 0]} fontSize={2} color="#1E3A8A" fontWeight="bold">ZONE C</Text>
            <ContainerStack position={[0, 0, 0]} rows={2} cols={6} levels={2} />
          </group>

          <group position={[15, 0, 15]}>
            <Text position={[0, 0.1, 8]} rotation={[-Math.PI / 2, 0, 0]} fontSize={2} color="#1E3A8A" fontWeight="bold">ZONE D</Text>
            <ContainerStack position={[0, 0, 0]} rows={3} cols={3} levels={5} />
          </group>

          <OrbitControls 
            makeDefault 
            maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera from going below floor
            minDistance={10}
            maxDistance={150}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

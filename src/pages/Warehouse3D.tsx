import { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { WarehouseScene } from '../components/3d/WarehouseScene';
import { Legend } from '../components/ui/Legend';
import { SidePanel } from '../components/ui/SidePanel';

export function Warehouse3D() {
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  return (
    <DashboardLayout>
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
        
        {/* The 3D Canvas */}
        <WarehouseScene />
        
        {/* UI Overlays */}
        <div style={{ position: 'absolute', bottom: '24px', left: '24px', zIndex: 10 }}>
          <Legend />
        </div>

        {isPanelOpen && (
          <SidePanel 
            title="Tạo lộ trình xuất mới" 
            onClose={() => setIsPanelOpen(false)} 
          />
        )}
        
      </div>
    </DashboardLayout>
  );
}

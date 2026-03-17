import { DashboardLayout } from '../components/layout/DashboardLayout';
import './Warehouse2D.css';

// Mock data similar to 3D for consistency
const zones = [
  { id: 'zone-a', name: 'Khu A - Hàng Khô', color: 'var(--status-dry)', rows: 4, cols: 5 },
  { id: 'zone-b', name: 'Khu B - Hàng Lạnh', color: 'var(--status-cold)', rows: 3, cols: 4 },
  { id: 'zone-c', name: 'Khu C - Hàng Dễ Vỡ', color: 'var(--status-fragile)', rows: 2, cols: 6 },
  { id: 'zone-d', name: 'Khu D - Khác', color: 'var(--status-other)', rows: 3, cols: 3 },
];

export function Warehouse2D() {
  return (
    <DashboardLayout>
      <div className="warehouse-2d-container">
        
        <div className="view-toggle">
           {/* In a real app we'd conditionally render or handle Route links here */}
           <a href="/3d" className="btn-secondary">Sơ đồ 3D</a >
           <div className="active-view">Sơ đồ 2D Mặt phẳng</div>
        </div>

        <div className="grid-floor">
          {zones.map((zone) => (
            <div key={zone.id} className="zone-area">
              <h3 className="zone-title" style={{ color: zone.color }}>{zone.name}</h3>
              <div 
                className="zone-grid" 
                style={{ 
                  gridTemplateColumns: `repeat(${zone.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${zone.rows}, 1fr)`
                }}
              >
                {Array.from({ length: zone.rows * zone.cols }).map((_, i) => (
                   <div 
                     key={i} 
                     className="grid-slot"
                     style={{ 
                       backgroundColor: Math.random() > 0.7 ? '#E2E8F0' : zone.color,
                       opacity: Math.random() > 0.7 ? 0.3 : 0.9 
                     }}
                   >
                     {/* Slot {i} */}
                   </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

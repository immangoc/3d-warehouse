import { useState } from 'react';
import { Truck, ChevronRight, Search, Plus } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { WarehouseScene } from '../components/3d/WarehouseScene';
import { Legend } from '../components/ui/Legend';
import { SidePanel } from '../components/ui/SidePanel';
import './Warehouse3D.css';

export function Warehouse3D() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="warehouse-page">
        {/* Page Header */}
        <div className="w3d-page-header">
          <div className="w3d-title-block">
            <h1 className="w3d-title">Sơ đồ 3D kho bãi trực quan</h1>
            <p className="w3d-subtitle">Xem tổng quan kho bãi và đường đi container</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="w3d-action-bar">
          <button className="container-info-card" onClick={() => setIsPanelOpen(true)}>
            <div className="container-info-icon">
              <Truck size={20} />
            </div>
            <div className="container-info-text">
              <span className="container-info-label">Container chờ nhập kho</span>
              <span className="container-info-sub">Container CNT-2024-001</span>
            </div>
            <ChevronRight size={18} className="container-info-chevron" />
          </button>

          <div className="w3d-spacer" />

          <div className="w3d-search-box">
            <Search size={16} className="w3d-search-icon" />
            <input
              type="text"
              placeholder="Nhập mã số Container..."
              className="w3d-search-input"
            />
          </div>

          <button className="btn-primary w3d-import-btn">
            <Plus size={18} />
            <span>Nhập/Xuất</span>
          </button>
        </div>

        {/* 3D Canvas Area */}
        <div className="w3d-canvas-area">
          <WarehouseScene />

          {/* Legend overlay */}
          <div className="w3d-legend-overlay">
            <Legend />
          </div>

          {/* Side Panel */}
          {isPanelOpen && (
            <SidePanel
              title="Tạo lộ trình xuất mới"
              onClose={() => setIsPanelOpen(false)}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

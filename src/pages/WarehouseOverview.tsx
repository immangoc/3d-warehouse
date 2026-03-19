import { useState, useRef } from 'react';
import {
  Search, ZoomIn, ZoomOut, Compass,
  Package, Snowflake, AlertTriangle, Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { OverviewScene } from '../components/3d/OverviewScene';
import type { OverviewSceneHandle } from '../components/3d/OverviewScene';
import type { ZoneInfo, WHType } from '../components/3d/WarehouseScene';
import { Legend } from '../components/ui/Legend';
import './WarehouseOverview.css';

// ─── Types & Data ─────────────────────────────────────────────────────────────
interface WHStat {
  id: WHType;
  name: string;
  color: string;
  bgColor: string;
  pct: string;
  empty: number;
}

const WH_STATS: WHStat[] = [
  { id: 'cold',    name: 'Kho Lạnh',       color: '#3B82F6', bgColor: '#EFF6FF', pct: '65%',  empty: 25 },
  { id: 'dry',     name: 'Kho Khô',        color: '#F97316', bgColor: '#FFF7ED', pct: '80%',  empty: 12 },
  { id: 'fragile', name: 'Kho Hàng dễ vỡ', color: '#EF4444', bgColor: '#FEF2F2', pct: '45%',  empty: 18 },
  { id: 'other',   name: 'Kho khác',       color: '#9CA3AF', bgColor: '#F9FAFB', pct: '90%',  empty: 5 },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
function WHIcon({ type, size = 18 }: { type: WHType; size?: number }) {
  if (type === 'cold')    return <Snowflake     size={size} />;
  if (type === 'dry')     return <Package       size={size} />;
  if (type === 'fragile') return <AlertTriangle size={size} />;
  return                         <Layers        size={size} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ wh, onClick }: { wh: WHStat; onClick: () => void }) {
  return (
    <button className="ov-stat-card" onClick={onClick}>
      <div className="ov-stat-left">
        <p className="ov-stat-name">{wh.name}</p>
        <p className="ov-stat-pct" style={{ color: wh.color }}>{wh.pct}</p>
        <p className="ov-stat-sub">{wh.empty} vị trí trống</p>
      </div>
      <div className="ov-stat-icon-wrap" style={{ backgroundColor: wh.bgColor }}>
        <span style={{ color: wh.color }}><WHIcon type={wh.id} size={22} /></span>
      </div>
    </button>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────────
function DonutChart({ pct }: { pct: number }) {
  const r = 48, c = 2 * Math.PI * r;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#E5E7EB" strokeWidth="14" />
      <circle cx="65" cy="65" r={r} fill="none" stroke="#1E3A8A" strokeWidth="14"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 65 65)" />
      <text x="65" y="70" textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827">{pct}%</text>
    </svg>
  );
}

// ─── Zone info panel ──────────────────────────────────────────────────────────
function ZoneInfoPanel({ zone }: { zone: ZoneInfo }) {
  const isWarning = zone.fillRate >= 90;
  return (
    <div className="ov-right-panel">
      <div className="ov-rp-zone-header">
        <h2 className="ov-rp-zone-name">{zone.name}</h2>
        <p className="ov-rp-zone-type">{zone.type}</p>
      </div>
      {isWarning && (
        <div className="ov-rp-warning-banner">
          <AlertTriangle size={16} />
          <span>Cảnh báo: Khu vực gần đầy ({zone.fillRate}%)</span>
        </div>
      )}
      <div className="ov-rp-section-label">Tỷ lệ lấp đầy</div>
      <div className="ov-rp-donut-wrap"><DonutChart pct={zone.fillRate} /></div>
      <p className="ov-rp-stat">Số vị trí trống: <strong>{zone.emptySlots}/{zone.totalSlots}</strong></p>
      <div className="ov-rp-section-label ov-rp-mt">Danh sách Container nhập gần đây:</div>
      <ul className="ov-rp-container-list">
        {zone.recentContainers.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export function WarehouseOverview() {
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);
  const sceneRef = useRef<OverviewSceneHandle>(null);
  const navigate = useNavigate();

  function handleZoneClick(zone: ZoneInfo) {
    setSelectedZone(zone);
  }

  function navigateToWarehouse(whId: WHType) {
    navigate(`/3d?wh=${whId}`);
  }

  return (
    <DashboardLayout>
      <div className="ov-page">

        {/* ── Header ── */}
        <div className="ov-header">
          <h1 className="ov-title">Tổng quan 3D toàn bộ kho bãi</h1>
          <p className="ov-subtitle">Xem tổng quan tất cả kho bãi: Kho Lạnh, Kho Khô, Kho Hàng dễ vỡ, Kho Khác</p>
        </div>

        {/* ── Stat cards ── */}
        <div className="ov-stat-row">
          {WH_STATS.map((wh) => (
            <StatCard key={wh.id} wh={wh} onClick={() => navigateToWarehouse(wh.id)} />
          ))}
        </div>

        {/* ── Action bar ── */}
        <div className="ov-action-bar">
          <div className="ov-spacer" />
          <div className="ov-search">
            <Search size={15} className="ov-search-icon" />
            <input type="text" placeholder="Tìm kiếm kho / container..." />
          </div>
        </div>

        {/* ── Content row: 3D canvas + right panel ── */}
        <div className="ov-content-row">
          <div className="ov-canvas-wrap">
            <OverviewScene ref={sceneRef} onZoneClick={handleZoneClick} />
            <div className="ov-controls">
              <button className="ov-ctrl-btn" aria-label="Zoom in"   onClick={() => sceneRef.current?.zoomIn()}>   <ZoomIn  size={18} /></button>
              <button className="ov-ctrl-btn" aria-label="Zoom out"  onClick={() => sceneRef.current?.zoomOut()}>  <ZoomOut size={18} /></button>
              <button className="ov-ctrl-btn ov-ctrl-btn-primary" aria-label="Reset view" onClick={() => sceneRef.current?.resetView()}><Compass size={18} /></button>
            </div>
          </div>

          {selectedZone && <ZoneInfoPanel zone={selectedZone} />}
        </div>

        {/* ── Legend ── */}
        <div className="ov-legend-row"><Legend /></div>
      </div>
    </DashboardLayout>
  );
}

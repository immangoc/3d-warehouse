import { useState } from 'react';
import { useRef } from 'react';
import {
  Search, Plus, ChevronLeft, ZoomIn, ZoomOut, Compass,
  Package, Calendar, Truck, ChevronRight,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { WarehouseScene } from '../components/3d/WarehouseScene';
import type { ZoneInfo, SceneHandle } from '../components/3d/WarehouseScene';
import { Legend } from '../components/ui/Legend';
import './Warehouse3D.css';

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
  return (
    <div className="right-panel">
      <div className="rp-header">
        <h2 className="rp-zone-name">{zone.name}</h2>
        <p className="rp-zone-type">{zone.type}</p>
      </div>
      <div className="rp-section-label">Tỷ lệ lấp đầy</div>
      <div className="rp-donut-wrap"><DonutChart pct={zone.fillRate} /></div>
      <p className="rp-stat">Số vị trí trống: <strong>{zone.emptySlots}/{zone.totalSlots}</strong></p>
      <div className="rp-section-label rp-mt">Danh sách Container nhập gần đây:</div>
      <ul className="rp-container-list">
        {zone.recentContainers.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </div>
  );
}

// ─── Waiting list panel ───────────────────────────────────────────────────────
const WAITING_CONTAINERS = ['CTN-2026-1234', 'CTN-2026-1235'];

function WaitingListPanel({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="right-panel rp-import">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="rp-import-title">Container chờ nhập</h2>
      </div>
      <div className="rp-import-body">
        {WAITING_CONTAINERS.map((code) => (
          <button key={code} className="waiting-item" onClick={() => onSelect(code)}>
            <div className="waiting-icon"><Truck size={18} /></div>
            <span className="waiting-code">{code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Import panel ─────────────────────────────────────────────────────────────
type ImportStep = 'form' | 'suggestion' | 'manual';

function ImportPanel({ onClose, initialCode }: { onClose: () => void; initialCode?: string }) {
  const [step, setStep] = useState<ImportStep>('form');
  const [form, setForm] = useState({
    containerCode: initialCode ?? 'CTN-2026-1234',
    cargoType: 'Hàng Khô',
    weight: '25 tấn',
    exportDate: '2026-08-15',
    priority: 'Cao',
  });
  const [manualZone, setManualZone]      = useState('Kho Hàng Khô');
  const [manualWarehouse, setManualWH]   = useState('Zone A');
  const [manualFloor, setManualFloor]    = useState('1');
  const [manualPos, setManualPos]        = useState('CT01');

  return (
    <div className="right-panel rp-import">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="rp-import-title">Nhập Container</h2>
      </div>
      <div className="rp-import-body">
        {step === 'form' && (
          <>
            <div className="rp-field">
              <label>Mã số container</label>
              <input type="text" value={form.containerCode}
                onChange={(e) => setForm({ ...form, containerCode: e.target.value })} />
            </div>
            <div className="rp-field">
              <label>Loại hàng</label>
              <div className="rp-select-wrap">
                <select value={form.cargoType}
                  onChange={(e) => setForm({ ...form, cargoType: e.target.value })}>
                  <option>Hàng Khô</option><option>Hàng Lạnh</option>
                  <option>Hàng dễ vỡ</option><option>Khác</option>
                </select>
              </div>
            </div>
            <div className="rp-field">
              <label>Trọng lượng</label>
              <input type="text" value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </div>
            <div className="rp-field">
              <label>Ngày xuất (dự kiến)</label>
              <div className="rp-date-wrap">
                <Calendar size={15} className="rp-date-icon" />
                <input type="date" value={form.exportDate}
                  onChange={(e) => setForm({ ...form, exportDate: e.target.value })} />
              </div>
            </div>
            <div className="rp-field">
              <label>Mức độ ưu tiên</label>
              <span className="rp-priority-value">{form.priority}</span>
            </div>
            <button className="btn-primary rp-submit-btn" onClick={() => setStep('suggestion')}>
              Nhận gợi ý vị trí
            </button>
          </>
        )}

        {(step === 'suggestion' || step === 'manual') && (
          <>
            <div className="rp-suggestion-card">
              <div className="rp-sug-header">
                <div className="rp-sug-icon"><Package size={18} /></div>
                <span className="rp-sug-title">Gợi ý vị trí</span>
              </div>
              <div className="rp-sug-row">
                <span>Vị trí</span>
                <span className="rp-sug-value rp-blue">Zone B - Kho Khô<br />Tầng 3 - CT01</span>
              </div>
              <div className="rp-sug-row">
                <span>Hiệu quả tối ưu</span>
                <span className="rp-sug-value rp-green">94%</span>
              </div>
              <div className="rp-sug-row">
                <span>Số Container đảo chuyển</span>
                <span className="rp-sug-value rp-green">0</span>
              </div>
            </div>

            {step === 'suggestion' && (
              <>
                <button className="btn-primary rp-submit-btn" onClick={() => setStep('manual')}>
                  Xác nhận nhập
                </button>
                <button className="rp-cancel-link" onClick={onClose}>Hủy</button>
              </>
            )}

            {step === 'manual' && (
              <>
                <div className="rp-manual-title">Điều chỉnh vị trí thủ công</div>
                {[
                  { label: 'Khu nhập', value: manualZone, setter: setManualZone, options: ['Kho Hàng Lạnh','Kho Hàng Khô','Kho Hàng Dễ Vỡ','Kho Khác'] },
                  { label: 'Zone', value: manualWarehouse, setter: setManualWH, options: ['Zone A','Zone B','Zone C'] },
                  { label: 'Tầng', value: manualFloor, setter: setManualFloor, options: ['1','2','3'] },
                ].map(({ label, value, setter, options }) => (
                  <div key={label} className="rp-field">
                    <label>{label}</label>
                    <div className="rp-select-wrap">
                      <select value={value} onChange={(e) => setter(e.target.value)}>
                        {options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <div className="rp-field">
                  <label>Vị trí</label>
                  <input type="text" value={manualPos}
                    onChange={(e) => setManualPos(e.target.value)} />
                </div>
                <button className="btn-primary rp-submit-btn">Xác nhận nhập</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type PanelMode = null | 'zone' | 'waiting-list' | 'import';

export function Warehouse3D() {
  const [panelMode, setPanelMode]         = useState<PanelMode>(null);
  const [selectedZone, setSelectedZone]   = useState<ZoneInfo | null>(null);
  const [selectedCode, setSelectedCode]   = useState<string | undefined>(undefined);
  const sceneRef = useRef<SceneHandle>(null);

  const showCard    = panelMode === null || panelMode === 'zone';
  const showButton  = !showCard;


  function handleZoneClick(zone: ZoneInfo) {
    setSelectedZone(zone);
    setPanelMode('zone');
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedZone(null);
    setSelectedCode(undefined);
  }

  function openWaiting() {
    setPanelMode('waiting-list');
    setSelectedZone(null);
  }

  function selectContainer(code: string) {
    setSelectedCode(code);
    setPanelMode('import');
  }

  return (
    <DashboardLayout>
      <div className="w3d-page">

        {/* ── Header ── */}
        <div className="w3d-header">
          <h1 className="w3d-title">Sơ đồ 3D kho bãi trực quan</h1>
          <p className="w3d-subtitle">Xem tổng quan kho bãi và đường đi container</p>
        </div>

        {/* ── Action bar ── */}
        <div className="w3d-action-bar">
          {/* Search — always left */}
          <div className="w3d-search">
            <Search size={15} className="w3d-search-icon" />
            <input type="text" placeholder="Nhập mã số Container..." />
          </div>

          <div className="w3d-spacer" />

          {/* Right side: card OR button */}
          {showCard && (
            <button className="ctn-card" onClick={openWaiting}>
              <div className="ctn-card-icon"><Truck size={20} /></div>
              <div className="ctn-card-text">
                <span className="ctn-card-label">Container chờ nhập kho</span>
                <span className="ctn-card-sub">Container CNT-2024-001</span>
              </div>
              <ChevronRight size={17} className="ctn-card-chevron" />
            </button>
          )}
          {showButton && (
            <button className="btn-primary w3d-import-btn" onClick={() => setPanelMode('import')}>
              <Plus size={17} /><span>Nhập/Xuất</span>
            </button>
          )}
        </div>

        {/* ── Canvas row ── */}
        <div className="w3d-canvas-row">
          <div className="w3d-canvas-wrap">
            <WarehouseScene ref={sceneRef} onZoneClick={handleZoneClick} />
            <div className="w3d-controls">
              <button className="ctrl-btn" aria-label="Zoom in"   onClick={() => sceneRef.current?.zoomIn()}>   <ZoomIn  size={18} /></button>
              <button className="ctrl-btn" aria-label="Zoom out"  onClick={() => sceneRef.current?.zoomOut()}>  <ZoomOut size={18} /></button>
              <button className="ctrl-btn ctrl-btn-primary" aria-label="Reset view" onClick={() => sceneRef.current?.resetView()}><Compass size={18} /></button>
            </div>
          </div>

          {panelMode === 'zone'         && selectedZone  && <ZoneInfoPanel zone={selectedZone} />}
          {panelMode === 'waiting-list' && (
            <WaitingListPanel onClose={closePanel} onSelect={selectContainer} />
          )}
          {panelMode === 'import'       && (
            <ImportPanel onClose={closePanel} initialCode={selectedCode} />
          )}
        </div>

        {/* ── Legend ── */}
        <div className="w3d-legend-row"><Legend /></div>
      </div>
    </DashboardLayout>
  );
}

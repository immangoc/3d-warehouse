import { useState } from 'react';
import {
  Truck, ChevronRight, Search, Plus, ChevronLeft,
  ZoomIn, ZoomOut, Compass, Package, Calendar,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { WarehouseScene } from '../components/3d/WarehouseScene';
import type { ZoneInfo } from '../components/3d/WarehouseScene';
import { Legend } from '../components/ui/Legend';
import './Warehouse3D.css';

// ─── DonutChart ───────────────────────────────────────────────────────────────
function DonutChart({ pct }: { pct: number }) {
  const r = 48;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#E5E7EB" strokeWidth="14" />
      <circle
        cx="65" cy="65" r={r}
        fill="none"
        stroke="#1E3A8A"
        strokeWidth="14"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 65 65)"
      />
      <text x="65" y="70" textAnchor="middle" fontSize="20" fontWeight="700" fill="#111827">
        {pct}%
      </text>
    </svg>
  );
}

// ─── Zone Info Panel ──────────────────────────────────────────────────────────
function ZoneInfoPanel({ zone, onClose }: { zone: ZoneInfo; onClose: () => void }) {
  return (
    <div className="right-panel">
      <div className="rp-header">
        <h2 className="rp-zone-name">{zone.name}</h2>
        <p className="rp-zone-type">{zone.type}</p>
      </div>

      <div className="rp-section-label">Tỷ lệ lấp đầy</div>
      <div className="rp-donut-wrap">
        <DonutChart pct={zone.fillRate} />
      </div>

      <p className="rp-stat">
        Số vị trí trống:{' '}
        <strong>{zone.emptySlots}/{zone.totalSlots}</strong>
      </p>

      <div className="rp-section-label rp-mt">Danh sách Container nhập gần đây:</div>
      <ul className="rp-container-list">
        {zone.recentContainers.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Import Panel ─────────────────────────────────────────────────────────────
type ImportStep = 'form' | 'suggestion' | 'manual';

interface ImportFormState {
  containerCode: string;
  cargoType: string;
  weight: string;
  exportDate: string;
  priority: string;
}

function ImportPanel({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ImportStep>('form');
  const [form, setForm] = useState<ImportFormState>({
    containerCode: 'CTN-2026-1234',
    cargoType: 'Hàng Khô',
    weight: '25 tấn',
    exportDate: '2026-08-15',
    priority: 'Cao',
  });
  const [manualZone, setManualZone] = useState('Zone B');
  const [manualWarehouse, setManualWarehouse] = useState('Hàng Khô');
  const [manualFloor, setManualFloor] = useState('1');
  const [manualPos, setManualPos] = useState('CT01');

  return (
    <div className="right-panel rp-import">
      {/* Header */}
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="rp-import-title">Nhập Container</h2>
      </div>

      <div className="rp-import-body">
        {step === 'form' && (
          <>
            <div className="rp-field">
              <label>Mã số container</label>
              <input
                type="text"
                value={form.containerCode}
                onChange={(e) => setForm({ ...form, containerCode: e.target.value })}
              />
            </div>
            <div className="rp-field">
              <label>Loại hàng</label>
              <div className="rp-select-wrap">
                <select
                  value={form.cargoType}
                  onChange={(e) => setForm({ ...form, cargoType: e.target.value })}
                >
                  <option>Hàng Khô</option>
                  <option>Hàng Lạnh</option>
                  <option>Hàng dễ vỡ</option>
                  <option>Khác</option>
                </select>
              </div>
            </div>
            <div className="rp-field">
              <label>Trọng lượng</label>
              <input
                type="text"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div className="rp-field">
              <label>Ngày xuất (dự kiến)</label>
              <div className="rp-date-wrap">
                <Calendar size={15} className="rp-date-icon" />
                <input
                  type="date"
                  value={form.exportDate}
                  onChange={(e) => setForm({ ...form, exportDate: e.target.value })}
                />
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
            {/* Suggestion card */}
            <div className="rp-suggestion-card">
              <div className="rp-sug-header">
                <div className="rp-sug-icon">
                  <Package size={18} />
                </div>
                <span className="rp-sug-title">Gợi ý vị trí</span>
              </div>
              <div className="rp-sug-row">
                <span>Vị trí</span>
                <span className="rp-sug-value rp-blue">
                  Zone B - Kho Khô<br />Tầng 3 - CT01
                </span>
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
                <button className="rp-cancel-link" onClick={onClose}>
                  Hủy
                </button>
              </>
            )}

            {step === 'manual' && (
              <>
                <div className="rp-manual-title">Điều chỉnh vị trí thủ công</div>

                <div className="rp-field">
                  <label>Khu nhập</label>
                  <div className="rp-select-wrap">
                    <select value={manualZone} onChange={(e) => setManualZone(e.target.value)}>
                      <option>Zone A</option>
                      <option>Zone B</option>
                      <option>Zone C</option>
                      <option>Zone D</option>
                    </select>
                  </div>
                </div>
                <div className="rp-field">
                  <label>Kho nhập</label>
                  <div className="rp-select-wrap">
                    <select value={manualWarehouse} onChange={(e) => setManualWarehouse(e.target.value)}>
                      <option>Hàng Khô</option>
                      <option>Hàng Lạnh</option>
                      <option>Hàng dễ vỡ</option>
                      <option>Khác</option>
                    </select>
                  </div>
                </div>
                <div className="rp-field">
                  <label>Tầng</label>
                  <div className="rp-select-wrap">
                    <select value={manualFloor} onChange={(e) => setManualFloor(e.target.value)}>
                      <option>1</option>
                      <option>2</option>
                      <option>3</option>
                      <option>4</option>
                    </select>
                  </div>
                </div>
                <div className="rp-field">
                  <label>Vị trí</label>
                  <input
                    type="text"
                    value={manualPos}
                    onChange={(e) => setManualPos(e.target.value)}
                  />
                </div>
                <button className="btn-primary rp-submit-btn">
                  Xác nhận nhập
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type PanelMode = null | 'zone' | 'import';

export function Warehouse3D() {
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneInfo | null>(null);

  const isImportOpen = panelMode === 'import';
  const isZoneOpen = panelMode === 'zone';
  const isPanelOpen = isImportOpen || isZoneOpen;

  function handleZoneClick(zone: ZoneInfo) {
    setSelectedZone(zone);
    setPanelMode('zone');
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedZone(null);
  }

  function openImport() {
    setPanelMode('import');
    setSelectedZone(null);
  }

  return (
    <DashboardLayout>
      <div className="w3d-page">
        {/* ── Page header ── */}
        <div className="w3d-header">
          <h1 className="w3d-title">Sơ đồ 3D kho bãi trực quan</h1>
          <p className="w3d-subtitle">Xem tổng quan kho bãi và đường đi container</p>
        </div>

        {/* ── Action bar ── */}
        <div className="w3d-action-bar">
          {!isImportOpen && (
            <button className="ctn-card" onClick={() => setPanelMode('zone')}>
              <div className="ctn-card-icon">
                <Truck size={20} />
              </div>
              <div className="ctn-card-text">
                <span className="ctn-card-label">Container chờ nhập kho</span>
                <span className="ctn-card-sub">Container CNT-2024-001</span>
              </div>
              <ChevronRight size={17} className="ctn-card-chevron" />
            </button>
          )}

          <div className="w3d-spacer" />

          <div className="w3d-search">
            <Search size={15} className="w3d-search-icon" />
            <input type="text" placeholder="Nhập mã số Container..." />
          </div>

          <button className="btn-primary w3d-import-btn" onClick={openImport}>
            <Plus size={17} />
            <span>Nhập/Xuất</span>
          </button>
        </div>

        {/* ── Canvas row ── */}
        <div className="w3d-canvas-row">
          {/* 3D Canvas */}
          <div className="w3d-canvas-wrap">
            <WarehouseScene onZoneClick={handleZoneClick} />

            {/* Zoom controls */}
            <div className="w3d-controls">
              <button className="ctrl-btn" aria-label="Zoom in">
                <ZoomIn size={18} />
              </button>
              <button className="ctrl-btn" aria-label="Zoom out">
                <ZoomOut size={18} />
              </button>
              <button className="ctrl-btn ctrl-btn-primary" aria-label="Reset view">
                <Compass size={18} />
              </button>
            </div>
          </div>

          {/* Right panel */}
          {isZoneOpen && selectedZone && (
            <ZoneInfoPanel zone={selectedZone} onClose={closePanel} />
          )}
          {isImportOpen && (
            <ImportPanel onClose={closePanel} />
          )}
        </div>

        {/* ── Legend below canvas ── */}
        <div className="w3d-legend-row">
          <Legend />
        </div>
      </div>
    </DashboardLayout>
  );
}

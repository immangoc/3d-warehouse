import { useState } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight,
  Snowflake, Package, AlertTriangle, Layers,
  Thermometer, Truck, Calendar,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import './Warehouse2D.css';

// ─── Types & Data ─────────────────────────────────────────────────────────────
const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];
type WHType = 'cold' | 'dry' | 'fragile' | 'other';

interface WHConfig {
  id: WHType;
  name: string;
  color: string;
  bgColor: string;
  totalFloors: number;
  hasTemp?: boolean;
  temp?: string;
}

const WAREHOUSES: WHConfig[] = [
  { id: 'cold',    name: 'Kho Lạnh',       color: '#3B82F6', bgColor: '#EFF6FF', totalFloors: 3, hasTemp: true, temp: '18 độ C' },
  { id: 'dry',     name: 'Kho Khô',         color: '#F97316', bgColor: '#FFF7ED', totalFloors: 3 },
  { id: 'fragile', name: 'Kho Hàng dễ vỡ', color: '#EF4444', bgColor: '#FEF2F2', totalFloors: 3 },
  { id: 'other',   name: 'Kho khác',        color: '#9CA3AF', bgColor: '#F9FAFB', totalFloors: 3 },
];

// Deterministic grid: 5 rows × 8 cols
function makeGrid(seed: number): boolean[][] {
  const rows = 5, cols = 8;
  const seededRandom = (n: number) => {
    const x = Math.sin(n + seed) * 10000;
    return x - Math.floor(x);
  };
  let idx = 0;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, c) => {
      const rate = c < 4 ? 0.97 : Math.max(0, 0.93 - (c - 3) * (seed * 0.3 + 0.1));
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

// ─── Slot grid ────────────────────────────────────────────────────────────────
function SlotGrid({ grid, color, highlighted }: {
  grid: boolean[][];
  color: string;
  highlighted?: { row: number; col: number } | null;
}) {
  return (
    <div className="slot-area">
      {(['left', 'right'] as const).map((side) => {
        const start = side === 'left' ? 0 : 4;
        return (
          <div key={side} className="slot-block">
            {grid.map((row, ri) => (
              <div key={ri} className="slot-row">
                {row.slice(start, start + 4).map((filled, ci) => {
                  const absCol = start + ci;
                  const isHL = highlighted?.row === ri && highlighted?.col === absCol;
                  return (
                    <div
                      key={ci}
                      className={`slot ${filled ? 'slot-filled' : 'slot-empty'} ${isHL ? 'slot-hl' : ''}`}
                      style={{
                        backgroundColor: isHL ? `${color}26` : filled ? color : '#E5E7EB',
                        border: isHL ? `2px solid ${color}` : '2px solid transparent',
                        color: filled ? '#fff' : isHL ? color : '#9CA3AF',
                      }}
                    >
                      CT01
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function WHIcon({ type, size = 18 }: { type: WHType; size?: number }) {
  if (type === 'cold')    return <Snowflake     size={size} />;
  if (type === 'dry')     return <Package       size={size} />;
  if (type === 'fragile') return <AlertTriangle size={size} />;
  return                         <Layers        size={size} />;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ wh }: { wh: WHConfig }) {
  return (
    <div className="stat-card">
      <div className="stat-left">
        <p className="stat-name">{wh.name}</p>
        <p className="stat-pct" style={{ color: wh.color }}>70,1%</p>
        <p className="stat-sub">189 vị trí trống</p>
      </div>
      <div className="stat-icon-wrap" style={{ backgroundColor: wh.bgColor }}>
        <span style={{ color: wh.color }}><WHIcon type={wh.id} size={22} /></span>
      </div>
    </div>
  );
}

// ─── Warehouse card ───────────────────────────────────────────────────────────
function WarehouseCard({ wh, floor, highlight }: {
  wh: WHConfig;
  floor: number;
  highlight?: { row: number; col: number } | null;
}) {
  const [zoneIdx, setZoneIdx] = useState(0);
  const grid = getGrid(wh.id, ZONES[zoneIdx]);

  return (
    <div className="wh-card">
      <div className="wh-card-header">
        <div className="wh-card-title">
          <span style={{ color: wh.color }}><WHIcon type={wh.id} /></span>
          <span className="wh-name">{wh.name}</span>
        </div>
        <span className="wh-active" style={{ color: wh.color }}>Active</span>
      </div>

      <button className="wh-zone-selector" style={{ color: wh.color }}>
        {ZONES[zoneIdx]} <ChevronRight size={13} style={{ transform: 'rotate(90deg)', display: 'inline' }} />
      </button>

      <div className="wh-grid-area">
        <button className="wh-nav-btn"
          onClick={() => setZoneIdx((i) => (i - 1 + ZONES.length) % ZONES.length)}>
          <ChevronLeft size={15} />
        </button>
        <SlotGrid grid={grid} color={wh.color} highlighted={highlight} />
        <button className="wh-nav-btn"
          onClick={() => setZoneIdx((i) => (i + 1) % ZONES.length)}>
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="wh-card-footer">
        <div className="wh-footer-item"><Layers size={13} /><span>Tầng {floor}/{wh.totalFloors}</span></div>
        {wh.hasTemp && <div className="wh-footer-item"><Thermometer size={13} /><span>{wh.temp}</span></div>}
      </div>
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────
const WAITING = ['CTN-2026-1234', 'CTN-2026-1235'];

function WaitingListPanel({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="w2d-right-panel">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="rp-import-title">Container chờ nhập</h2>
      </div>
      <div className="rp-import-body">
        {WAITING.map((code) => (
          <button key={code} className="waiting-item" onClick={() => onSelect(code)}>
            <div className="waiting-icon"><Truck size={18} /></div>
            <span className="waiting-code">{code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ImportPanel({ onClose, initialCode }: { onClose: () => void; initialCode?: string }) {
  const [step, setStep] = useState<'form' | 'suggestion'>('form');
  const [form, setForm] = useState({
    containerCode: initialCode ?? 'CTN-2026-1234',
    cargoType: 'Hàng Khô',
    weight: '25 tấn',
    exportDate: '2026-08-15',
    priority: 'Cao',
  });

  return (
    <div className="w2d-right-panel">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="rp-import-title">Nhập Container</h2>
      </div>
      <div className="rp-import-body">
        {step === 'form' && (
          <>
            <div className="rp-field"><label>Mã số container</label>
              <input type="text" value={form.containerCode}
                onChange={(e) => setForm({ ...form, containerCode: e.target.value })} /></div>
            <div className="rp-field"><label>Loại hàng</label>
              <div className="rp-select-wrap">
                <select value={form.cargoType}
                  onChange={(e) => setForm({ ...form, cargoType: e.target.value })}>
                  <option>Hàng Khô</option><option>Hàng Lạnh</option>
                  <option>Hàng dễ vỡ</option><option>Khác</option>
                </select>
              </div>
            </div>
            <div className="rp-field"><label>Trọng lượng</label>
              <input type="text" value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
            <div className="rp-field"><label>Ngày xuất (dự kiến)</label>
              <div className="rp-date-wrap">
                <Calendar size={15} className="rp-date-icon" />
                <input type="date" value={form.exportDate}
                  onChange={(e) => setForm({ ...form, exportDate: e.target.value })} />
              </div>
            </div>
            <div className="rp-field"><label>Mức độ ưu tiên</label>
              <span className="rp-priority-value">{form.priority}</span></div>
            <button className="btn-primary rp-submit-btn" onClick={() => setStep('suggestion')}>
              Nhận gợi ý vị trí
            </button>
          </>
        )}
        {step === 'suggestion' && (
          <>
            <div className="rp-suggestion-card">
              <div className="rp-sug-header">
                <div className="rp-sug-icon"><Package size={16} /></div>
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
            <button className="btn-primary rp-submit-btn">Xác nhận nhập</button>
            <button className="rp-cancel-link" onClick={onClose}>Hủy</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type PanelMode = null | 'waiting-list' | 'import';

export function Warehouse2D() {
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedCode, setCode]   = useState<string | undefined>(undefined);
  const floors: Record<WHType, number> = { cold: 1, dry: 2, fragile: 1, other: 2 };

  function selectContainer(code: string) { setCode(code); setPanelMode('import'); }
  function closePanel() { setPanelMode(null); setCode(undefined); }

  const sugHL = panelMode === 'import' ? { row: 0, col: 5 } : null;

  return (
    <DashboardLayout>
      <div className="w2d-page">

        <div className="w2d-header">
          <h1 className="w2d-title">Sơ đồ 2D mặt phẳng kho bãi</h1>
          <p className="w2d-subtitle">Xem tổng quan kho bãi và đường đi container</p>
        </div>

        <div className="w2d-stat-row">
          {WAREHOUSES.map((wh) => <StatCard key={wh.id} wh={wh} />)}
        </div>

        <div className="w2d-action-bar">
          {panelMode === null && (
            <button className="ctn-card" onClick={() => setPanelMode('waiting-list')}>
              <div className="ctn-card-icon"><Truck size={20} /></div>
              <div className="ctn-card-text">
                <span className="ctn-card-label">Container chờ nhập kho</span>
                <span className="ctn-card-sub">Container CNT-2024-001</span>
              </div>
              <ChevronRight size={17} className="ctn-card-chevron" />
            </button>
          )}
          <div className="w2d-spacer" />
          <div className="w3d-search">
            <Search size={15} className="w3d-search-icon" />
            <input type="text" placeholder="Nhập mã số Container..." />
          </div>
          <button className="btn-primary w3d-import-btn" onClick={() => setPanelMode('import')}>
            <Plus size={17} /><span>Nhập/Xuất</span>
          </button>
        </div>

        <div className="w2d-content-row">
          <div className="w2d-wh-grid">
            {WAREHOUSES.map((wh) => (
              <WarehouseCard
                key={wh.id}
                wh={wh}
                floor={floors[wh.id]}
                highlight={wh.id === 'dry' && panelMode === 'import' ? sugHL : null}
              />
            ))}
          </div>

          {panelMode === 'waiting-list' && (
            <WaitingListPanel onClose={closePanel} onSelect={selectContainer} />
          )}
          {panelMode === 'import' && (
            <ImportPanel onClose={closePanel} initialCode={selectedCode} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

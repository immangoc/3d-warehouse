import { useState, useCallback } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, ChevronDown,
  Snowflake, Package, AlertTriangle, Layers,
  Thermometer, Truck, Calendar, Info, X,
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
  emptyColor: string;
  emptyBorder: string;
  totalFloors: number;
  hasTemp?: boolean;
  temp?: string;
}

const WAREHOUSES: WHConfig[] = [
  { id: 'cold',    name: 'Kho Lạnh',       color: '#3B82F6', bgColor: '#EFF6FF', emptyColor: '#DBEAFE', emptyBorder: '#BFDBFE', totalFloors: 3, hasTemp: true, temp: '18 độ C' },
  { id: 'dry',     name: 'Kho Khô',         color: '#F97316', bgColor: '#FFF7ED', emptyColor: '#FED7AA', emptyBorder: '#FDBA74', totalFloors: 3 },
  { id: 'fragile', name: 'Kho Hàng dễ vỡ', color: '#EF4444', bgColor: '#FEF2F2', emptyColor: '#FECACA', emptyBorder: '#FCA5A5', totalFloors: 3 },
  { id: 'other',   name: 'Kho khác',        color: '#9CA3AF', bgColor: '#F9FAFB', emptyColor: '#E5E7EB', emptyBorder: '#D1D5DB', totalFloors: 3 },
];

// ─── Grid generation (4 rows × 6 cols: 4×20ft + 2×40ft) ─────────────────────
function makeGrid(seed: number): boolean[][] {
  const rows = 4, cols = 6;
  const seededRandom = (n: number) => {
    const x = Math.sin(n + seed) * 10000;
    return x - Math.floor(x);
  };
  let idx = 0;
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (_, c) => {
      const isLeft = c < 4;
      const rate = isLeft
        ? 0.97
        : Math.max(0, 0.88 - Math.floor((c - 4) / 2) * (seed * 0.15 + 0.06));
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

// ─── Container detail data ───────────────────────────────────────────────────
interface SlotInfo {
  filled: boolean;
  label: string;
  type: '20ft' | '40ft';
  cargo?: string;
  weight?: string;
  temp?: string;
}

function getSlotInfo(filled: boolean, is40ft: boolean, seed: number): SlotInfo {
  const cargos = ['Thủy sản', 'Thịt đông lạnh', 'Rau củ', 'Trái cây', 'Kem', 'Sữa'];
  const sr = (n: number) => { const x = Math.sin(n + seed) * 10000; return x - Math.floor(x); };
  return {
    filled,
    label: 'CT01',
    type: is40ft ? '40ft' : '20ft',
    cargo: filled ? cargos[Math.floor(sr(seed + 1) * cargos.length)] : undefined,
    weight: filled ? `${Math.floor(sr(seed + 2) * 20 + 5)} tấn` : undefined,
    temp: filled ? `${Math.floor(sr(seed + 3) * 10 - 5)}°C` : undefined,
  };
}

// ─── Slot with tooltip ──────────────────────────────────────────────────────
function Slot({ info, color, emptyColor, isHL, onClickSlot }: {
  info: SlotInfo;
  color: string;
  emptyColor: string;
  isHL: boolean;
  onClickSlot?: (info: SlotInfo) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="slot-wrapper">
      <div
        className={`slot ${info.type === '40ft' ? 'slot-40' : 'slot-20'} ${info.filled ? 'slot-filled' : 'slot-empty'} ${isHL ? 'slot-hl' : ''}`}
        style={{
          backgroundColor: isHL ? `${color}20` : info.filled ? color : emptyColor,
          borderColor: isHL ? color : 'transparent',
          color: info.filled ? '#fff' : color,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onClickSlot?.(info)}
      >
        {info.label}
      </div>
      {hovered && info.filled && (
        <div className="slot-tooltip">
          <div className="slot-tooltip-row"><strong>{info.cargo}</strong></div>
          <div className="slot-tooltip-row">{info.weight} · {info.temp}</div>
          <div className="slot-tooltip-row">{info.type} container</div>
        </div>
      )}
    </div>
  );
}

// ─── Rack rendering ──────────────────────────────────────────────────────────
// A "rack" is a 2-col × 2-row visual block of container slots
function Rack({ rows, colStart, color, emptyColor, highlighted, is40ft, seedBase, onClickSlot }: {
  rows: boolean[][];
  colStart: number;
  color: string;
  emptyColor: string;
  highlighted?: { row: number; col: number } | null;
  is40ft: boolean;
  seedBase: number;
  onClickSlot?: (info: SlotInfo) => void;
}) {
  return (
    <div className="rack">
      {rows.map((row, ri) => (
        <div key={ri} className="rack-row">
          {[0, 1].map((ci) => {
            const absCol = colStart + ci;
            const filled = row[absCol];
            const isHL = highlighted?.row === ri && highlighted?.col === absCol;
            const info = getSlotInfo(filled, is40ft, seedBase + ri * 10 + absCol);
            return (
              <Slot key={ci} info={info} color={color} emptyColor={emptyColor} isHL={isHL} onClickSlot={onClickSlot} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SlotGrid({ grid, color, emptyColor, highlighted, animDir, onClickSlot }: {
  grid: boolean[][];
  color: string;
  emptyColor: string;
  highlighted?: { row: number; col: number } | null;
  animDir?: 'left' | 'right' | null;
  onClickSlot?: (info: SlotInfo) => void;
}) {
  // Split into 2 row groups of 2 rows each
  const rowGroups = [grid.slice(0, 2), grid.slice(2, 4)];

  // Column pairs for racks: left block [0-1, 2-3] (20ft), right block [4-5] (40ft)
  const leftPairs = [0, 2];
  const rightPairs = [4];

  const animClass = animDir === 'left' ? 'rack-slide-left' : animDir === 'right' ? 'rack-slide-right' : '';

  return (
    <div className={`rack-area ${animClass}`}>
      {rowGroups.map((rg, gi) => {
        const hlInGroup = highlighted && (gi === 0 ? highlighted.row < 2 : highlighted.row >= 2)
          ? { row: highlighted.row - gi * 2, col: highlighted.col }
          : null;
        return (
          <div key={gi} className="rack-row-group">
            <div className="rack-block">
              {leftPairs.map((cs) => (
                <Rack key={cs} rows={rg} colStart={cs} color={color} emptyColor={emptyColor} highlighted={hlInGroup} is40ft={false} seedBase={gi * 100 + cs} onClickSlot={onClickSlot} />
              ))}
            </div>
            <div className="rack-gap" />
            <div className="rack-block">
              {rightPairs.map((cs) => (
                <Rack key={cs} rows={rg} colStart={cs} color={color} emptyColor={emptyColor} highlighted={hlInGroup} is40ft={true} seedBase={gi * 100 + cs + 50} onClickSlot={onClickSlot} />
              ))}
            </div>
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

// ─── Container detail modal ──────────────────────────────────────────────────
function ContainerModal({ info, onClose }: { info: SlotInfo; onClose: () => void }) {
  return (
    <div className="slot-modal-overlay" onClick={onClose}>
      <div className="slot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="slot-modal-header">
          <h3>Container {info.label}</h3>
          <button className="slot-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="slot-modal-body">
          <div className="slot-modal-row">
            <span className="slot-modal-label">Loại</span>
            <span className="slot-modal-value">{info.type}</span>
          </div>
          <div className="slot-modal-row">
            <span className="slot-modal-label">Trạng thái</span>
            <span className={`slot-modal-badge ${info.filled ? 'badge-active' : 'badge-inactive'}`}>
              {info.filled ? 'Hoạt động' : 'Trống'}
            </span>
          </div>
          {info.filled && (
            <>
              <div className="slot-modal-row">
                <span className="slot-modal-label">Hàng hóa</span>
                <span className="slot-modal-value">{info.cargo}</span>
              </div>
              <div className="slot-modal-row">
                <span className="slot-modal-label">Trọng lượng</span>
                <span className="slot-modal-value">{info.weight}</span>
              </div>
              <div className="slot-modal-row">
                <span className="slot-modal-label">Nhiệt độ</span>
                <span className="slot-modal-value">{info.temp}</span>
              </div>
            </>
          )}
        </div>
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const grid = getGrid(wh.id, ZONES[zoneIdx]);

  const navigateZone = useCallback((dir: 'left' | 'right') => {
    setAnimDir(dir);
    setZoneIdx((i) => dir === 'left'
      ? (i - 1 + ZONES.length) % ZONES.length
      : (i + 1) % ZONES.length
    );
    setTimeout(() => setAnimDir(null), 300);
  }, []);

  const selectZone = useCallback((idx: number) => {
    setAnimDir('right');
    setZoneIdx(idx);
    setDropdownOpen(false);
    setTimeout(() => setAnimDir(null), 300);
  }, []);

  return (
    <div className="wh-card">
      <div className="wh-card-header">
        <div className="wh-card-title">
          <span style={{ color: wh.color }}><WHIcon type={wh.id} /></span>
          <span className="wh-name">{wh.name}</span>
        </div>
        <span className="wh-active" style={{ color: wh.color }}>Active</span>
      </div>

      <div className="wh-divider" />

      <div className="wh-zone-wrap">
        <button className="wh-zone-selector" style={{ color: wh.color }} onClick={() => setDropdownOpen(!dropdownOpen)}>
          {ZONES[zoneIdx]} <ChevronDown size={13} className={`wh-zone-chevron ${dropdownOpen ? 'wh-zone-chevron-open' : ''}`} />
        </button>
        {dropdownOpen && (
          <div className="wh-zone-dropdown">
            {ZONES.map((z, i) => (
              <button
                key={z}
                className={`wh-zone-option ${i === zoneIdx ? 'wh-zone-option-active' : ''}`}
                style={{ '--wh-color': wh.color } as React.CSSProperties}
                onClick={() => selectZone(i)}
              >
                {z}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="wh-grid-area">
        <button className="wh-nav-btn" onClick={() => navigateZone('left')}>
          <ChevronLeft size={15} />
        </button>
        <SlotGrid grid={grid} color={wh.color} emptyColor={wh.emptyColor} highlighted={highlight} animDir={animDir} onClickSlot={setSelectedSlot} />
        <button className="wh-nav-btn" onClick={() => navigateZone('right')}>
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="wh-card-footer">
        <div className="wh-footer-item"><Layers size={13} /><span>Tầng {floor}/{wh.totalFloors}</span></div>
        {wh.hasTemp && <div className="wh-footer-item"><Thermometer size={13} /><span>{wh.temp}</span></div>}
      </div>

      {selectedSlot && <ContainerModal info={selectedSlot} onClose={() => setSelectedSlot(null)} />}
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────
const WAITING = ['CTN-2026-1234', 'CTN-2026-1234'];

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
        {WAITING.map((code, idx) => (
          <button key={idx} className="waiting-item" onClick={() => onSelect(code)}>
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
                <div className="rp-sug-icon"><Info size={16} /></div>
                <span className="rp-sug-title">Gợi ý vị trí</span>
              </div>
              <div className="rp-sug-row">
                <span className="rp-sug-label">Vị trí</span>
                <span className="rp-sug-value rp-blue">Zone B - Kho Khô<br />Tầng 3 - CT01</span>
              </div>
              <div className="rp-sug-row">
                <span className="rp-sug-label">Hiệu quả tối ưu</span>
                <span className="rp-sug-value rp-blue">94%</span>
              </div>
              <div className="rp-sug-row">
                <span className="rp-sug-label">Số Container<br />đảo chuyển</span>
                <span className="rp-sug-value rp-blue">0</span>
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
          <div className="w2d-search">
            <Search size={15} className="w2d-search-icon" />
            <input type="text" placeholder="Nhập mã số Container..." />
          </div>
          <button className="btn-primary w2d-import-btn" onClick={() => setPanelMode('import')}>
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

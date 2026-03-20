import { useState, useCallback, useEffect } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, ChevronDown,
  Snowflake, Package, AlertTriangle, Layers,
  Thermometer, Truck, Calendar, Info, X,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import {
  ZONES, WAREHOUSES, WH_STATS,
  WAITING_CONTAINERS, getGridForFloor, getSlotInfo,
} from '../data/warehouse';
import type { WHType, WHConfig, SlotInfo, PreviewPosition } from '../data/warehouse';
import {
  findSuggestedPosition, addImportedContainer,
  cargoTypeToWHType, cargoTypeToWHName,
} from '../data/containerStore';
import type { SuggestedPosition } from '../data/containerStore';
import './Warehouse2D.css';

// ─── Slot with tooltip ──────────────────────────────────────────────────────
function Slot({ info, color, emptyColor, isHL, isGhost, onClickSlot }: {
  info: SlotInfo;
  color: string;
  emptyColor: string;
  isHL: boolean;
  isGhost?: boolean;
  onClickSlot?: (info: SlotInfo) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="slot-wrapper">
      <div
        className={`slot ${info.type === '40ft' ? 'slot-40' : 'slot-20'} ${info.filled ? 'slot-filled' : 'slot-empty'} ${isHL ? 'slot-hl' : ''} ${isGhost ? 'slot-ghost' : ''}`}
        style={{
          backgroundColor: isGhost ? `${color}30` : isHL ? `${color}20` : info.filled ? color : emptyColor,
          borderColor: isGhost ? color : isHL ? color : 'transparent',
          color: info.filled ? '#fff' : color,
          borderWidth: isGhost ? '2px' : undefined,
          borderStyle: isGhost ? 'dashed' : undefined,
          animation: isGhost ? 'ghostPulse 1.5s ease-in-out infinite' : undefined,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onClickSlot?.(info)}
      >
        {isGhost ? '⬚' : info.label}
      </div>
      {hovered && info.filled && !isGhost && (
        <div className="slot-tooltip">
          <div className="slot-tooltip-row"><strong>{info.cargo}</strong></div>
          <div className="slot-tooltip-row">{info.weight} · {info.temp}</div>
          <div className="slot-tooltip-row">{info.type} container</div>
        </div>
      )}
      {hovered && isGhost && (
        <div className="slot-tooltip">
          <div className="slot-tooltip-row"><strong>Vị trí gợi ý</strong></div>
          <div className="slot-tooltip-row">Container sẽ được đặt tại đây</div>
        </div>
      )}
    </div>
  );
}

// ─── Rack rendering ──────────────────────────────────────────────────────────
function Rack({ rows, colStart, color, emptyColor, highlighted, ghostPos, is40ft, seedBase, onClickSlot }: {
  rows: boolean[][];
  colStart: number;
  color: string;
  emptyColor: string;
  highlighted?: { row: number; col: number } | null;
  ghostPos?: { row: number; col: number } | null;
  is40ft: boolean;
  seedBase: number;
  onClickSlot?: (info: SlotInfo) => void;
}) {
  if (is40ft) {
    return (
      <div className="rack rack-40ft">
        {[0, 1].map((ci) => {
          const absCol = colStart + ci;
          const filled = rows[0][absCol];
          const isHL = highlighted?.row === 0 && highlighted?.col === absCol;
          const isGhost = ghostPos?.row === 0 && ghostPos?.col === absCol;
          const info = getSlotInfo(filled, is40ft, seedBase + absCol);
          return (
            <Slot key={ci} info={info} color={color} emptyColor={emptyColor} isHL={isHL} isGhost={isGhost} onClickSlot={onClickSlot} />
          );
        })}
      </div>
    );
  }

  return (
    <div className="rack">
      {rows.map((row, ri) => (
        <div key={ri} className="rack-row">
          {[0, 1].map((ci) => {
            const absCol = colStart + ci;
            const filled = row[absCol];
            const isHL = highlighted?.row === ri && highlighted?.col === absCol;
            const isGhost = ghostPos?.row === ri && ghostPos?.col === absCol;
            const info = getSlotInfo(filled, is40ft, seedBase + ri * 10 + absCol);
            return (
              <Slot key={ci} info={info} color={color} emptyColor={emptyColor} isHL={isHL} isGhost={isGhost} onClickSlot={onClickSlot} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SlotGrid({ grid, color, emptyColor, highlighted, ghostPos, animDir, onClickSlot }: {
  grid: boolean[][];
  color: string;
  emptyColor: string;
  highlighted?: { row: number; col: number } | null;
  ghostPos?: { row: number; col: number } | null;
  animDir?: 'left' | 'right' | null;
  onClickSlot?: (info: SlotInfo) => void;
}) {
  const rowGroups = [grid.slice(0, 2), grid.slice(2, 4)];
  const leftPairs = [0, 2];
  const rightPairs = [4, 6];

  const animClass = animDir === 'left' ? 'rack-slide-left' : animDir === 'right' ? 'rack-slide-right' : '';

  return (
    <div className={`rack-area ${animClass}`}>
      {rowGroups.map((rg, gi) => {
        const hlInGroup = highlighted && (gi === 0 ? highlighted.row < 2 : highlighted.row >= 2)
          ? { row: highlighted.row - gi * 2, col: highlighted.col }
          : null;
        const ghostInGroup = ghostPos && (gi === 0 ? ghostPos.row < 2 : ghostPos.row >= 2)
          ? { row: ghostPos.row - gi * 2, col: ghostPos.col }
          : null;
        return (
          <div key={gi} className="rack-row-group">
            <div className="rack-block">
              {leftPairs.map((cs) => (
                <Rack key={cs} rows={rg} colStart={cs} color={color} emptyColor={emptyColor} highlighted={hlInGroup} ghostPos={ghostInGroup} is40ft={false} seedBase={gi * 100 + cs} onClickSlot={onClickSlot} />
              ))}
            </div>
            <div className="rack-gap" />
            <div className="rack-block">
              {rightPairs.map((cs) => (
                <Rack key={cs} rows={rg} colStart={cs} color={color} emptyColor={emptyColor} highlighted={hlInGroup} ghostPos={ghostInGroup} is40ft={true} seedBase={gi * 100 + cs + 50} onClickSlot={onClickSlot} />
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
  const stat = WH_STATS.find(s => s.id === wh.id);
  return (
    <div className="stat-card">
      <div className="stat-left">
        <p className="stat-name">{wh.name}</p>
        <p className="stat-pct" style={{ color: wh.color }}>{stat?.pct ?? '—'}</p>
        <p className="stat-sub">{stat?.empty ?? 0} vị trí trống</p>
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
function WarehouseCard({ wh, highlight, ghostPos, ghostZone, ghostFloor }: {
  wh: WHConfig;
  highlight?: { row: number; col: number } | null;
  ghostPos?: { row: number; col: number } | null;
  ghostZone?: string;
  ghostFloor?: number;
}) {
  const [zoneIdx, setZoneIdx] = useState(0);
  const [floor, setFloor] = useState(1);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const grid = getGridForFloor(wh.id, ZONES[zoneIdx], floor);

  // Only show ghost on matching zone and floor
  const showGhost = ghostPos && ghostZone === ZONES[zoneIdx] && ghostFloor === floor;

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

  const floors = Array.from({ length: wh.totalFloors }, (_, i) => i + 1);

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
        <SlotGrid grid={grid} color={wh.color} emptyColor={wh.emptyColor} highlighted={highlight}
          ghostPos={showGhost ? ghostPos : null} animDir={animDir} onClickSlot={setSelectedSlot} />
        <button className="wh-nav-btn" onClick={() => navigateZone('right')}>
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="wh-card-footer">
        <div className="wh-floor-selector">
          <Layers size={13} className="wh-floor-icon" />
          {floors.map((f) => (
            <button
              key={f}
              className={`wh-floor-btn ${f === floor ? 'wh-floor-btn-active' : ''} ${ghostFloor === f && ghostZone === ZONES[zoneIdx] ? 'wh-floor-btn-ghost' : ''}`}
              style={{ '--wh-color': wh.color } as React.CSSProperties}
              onClick={() => setFloor(f)}
            >
              T{f}
            </button>
          ))}
        </div>
        {wh.hasTemp && <div className="wh-footer-item"><Thermometer size={13} /><span>{wh.temp}</span></div>}
      </div>

      {selectedSlot && <ContainerModal info={selectedSlot} onClose={() => setSelectedSlot(null)} />}
    </div>
  );
}

// ─── Panels ───────────────────────────────────────────────────────────────────
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
        {WAITING_CONTAINERS.map((ctn, idx) => (
          <button key={idx} className="waiting-item" onClick={() => onSelect(ctn.code)}>
            <div className="waiting-icon"><Truck size={18} /></div>
            <span className="waiting-code">{ctn.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ImportPanel({ onClose, initialCode, onPreviewChange }: {
  onClose: () => void;
  initialCode?: string;
  onPreviewChange: (pos: PreviewPosition | null) => void;
}) {
  const [step, setStep] = useState<'form' | 'suggestion' | 'manual'>('form');
  const [form, setForm] = useState({
    containerCode: initialCode ?? '',
    cargoType: 'Hàng Khô',
    sizeType: '20ft' as '20ft' | '40ft',
    weight: '',
    exportDate: '',
    priority: 'Cao',
  });
  const [suggestion, setSuggestion] = useState<SuggestedPosition | null>(null);
  const [manualZone, setManualZone]      = useState('Zone A');
  const [manualWarehouse, setManualWH]   = useState('Kho Khô');
  const [manualFloor, setManualFloor]    = useState('1');
  const [manualPos, setManualPos]        = useState('CT01');

  useEffect(() => {
    return () => onPreviewChange(null);
  }, [onPreviewChange]);

  function handleGetSuggestion() {
    const sug = findSuggestedPosition(form.cargoType, form.sizeType);
    setSuggestion(sug);
    setStep('suggestion');

    if (sug) {
      setManualZone(sug.zone);
      setManualWH(sug.whName);
      setManualFloor(String(sug.floor));
      setManualPos(sug.slot);
      onPreviewChange({
        whType: sug.whType,
        zone: sug.zone,
        floor: sug.floor,
        row: sug.row,
        col: sug.col,
        sizeType: sug.sizeType,
        containerCode: form.containerCode || 'Container mới',
      });
    }
  }

  function handleConfirmImport() {
    const whType = suggestion?.whType ?? cargoTypeToWHType(form.cargoType);
    const whName = suggestion?.whName ?? cargoTypeToWHName(form.cargoType);
    const zone = step === 'manual' ? manualZone : (suggestion?.zone ?? 'Zone A');
    const floor = step === 'manual' ? parseInt(manualFloor) : (suggestion?.floor ?? 1);
    const slot = step === 'manual' ? manualPos : (suggestion?.slot ?? 'R1C1');

    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

    addImportedContainer({
      code: form.containerCode || `CTN-${Date.now()}`,
      cargoType: form.cargoType,
      weight: form.weight,
      whType,
      whName,
      zone,
      floor,
      row: suggestion?.row ?? 0,
      col: suggestion?.col ?? 0,
      slot,
      sizeType: suggestion?.sizeType ?? form.sizeType,
      importDate: dateStr,
      exportDate: form.exportDate,
      priority: form.priority,
    });

    onPreviewChange(null);
    onClose();
  }

  function handleManualPositionChange(newZone: string, newFloor: string) {
    const whType = cargoTypeToWHType(manualWarehouse === 'Kho Lạnh' ? 'Hàng Lạnh'
      : manualWarehouse === 'Kho Hàng dễ vỡ' ? 'Hàng dễ vỡ'
      : manualWarehouse === 'Kho khác' ? 'Khác' : 'Hàng Khô');

    onPreviewChange({
      whType,
      zone: newZone,
      floor: parseInt(newFloor),
      row: suggestion?.row ?? 0,
      col: suggestion?.col ?? 0,
      sizeType: suggestion?.sizeType ?? form.sizeType,
      containerCode: form.containerCode || 'Container mới',
    });
  }

  return (
    <div className="w2d-right-panel">
      <div className="rp-import-header">
        <button className="rp-back-btn" onClick={step === 'form' ? () => { onPreviewChange(null); onClose(); } : () => { setStep('form'); onPreviewChange(null); }}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="rp-import-title">Nhập Container</h2>
      </div>
      <div className="rp-import-body">
        {step === 'form' && (
          <>
            <div className="rp-field"><label>Mã số container</label>
              <input type="text" value={form.containerCode} placeholder="VD: CTN-2026-1234"
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
            <div className="rp-field"><label>Loại container</label>
              <div className="rp-size-toggle">
                <button type="button"
                  className={`rp-size-btn ${form.sizeType === '20ft' ? 'rp-size-btn-active' : ''}`}
                  onClick={() => setForm({ ...form, sizeType: '20ft' })}>
                  20ft
                </button>
                <button type="button"
                  className={`rp-size-btn ${form.sizeType === '40ft' ? 'rp-size-btn-active' : ''}`}
                  onClick={() => setForm({ ...form, sizeType: '40ft' })}>
                  40ft
                </button>
              </div>
            </div>
            <div className="rp-field"><label>Trọng lượng</label>
              <input type="text" value={form.weight} placeholder="VD: 25 tấn"
                onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
            <div className="rp-field"><label>Ngày xuất (dự kiến)</label>
              <div className="rp-date-wrap">
                <Calendar size={15} className="rp-date-icon" />
                <input type="date" value={form.exportDate}
                  onChange={(e) => setForm({ ...form, exportDate: e.target.value })} />
              </div>
            </div>
            <div className="rp-field"><label>Mức độ ưu tiên</label>
              <div className="rp-select-wrap">
                <select value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Cao</option><option>Trung bình</option><option>Thấp</option>
                </select>
              </div>
            </div>
            <button className="btn-primary rp-submit-btn" onClick={handleGetSuggestion}>
              Nhận gợi ý vị trí
            </button>
          </>
        )}
        {(step === 'suggestion' || step === 'manual') && (
          <>
            <div className="rp-suggestion-card">
              <div className="rp-sug-header">
                <div className="rp-sug-icon"><Info size={16} /></div>
                <span className="rp-sug-title">Gợi ý vị trí</span>
              </div>
              {suggestion ? (
                <>
                  <div className="rp-sug-row">
                    <span className="rp-sug-label">Vị trí</span>
                    <span className="rp-sug-value rp-blue">{suggestion.zone} - {suggestion.whName}<br />Tầng {suggestion.floor} - {suggestion.slot}</span>
                  </div>
                  <div className="rp-sug-row">
                    <span className="rp-sug-label">Hiệu quả tối ưu</span>
                    <span className="rp-sug-value rp-blue">{suggestion.efficiency}%</span>
                  </div>
                  <div className="rp-sug-row">
                    <span className="rp-sug-label">Số Container<br />đảo chuyển</span>
                    <span className="rp-sug-value rp-blue">{suggestion.moves}</span>
                  </div>
                </>
              ) : (
                <div className="rp-sug-row">
                  <span className="rp-sug-label">Không tìm thấy vị trí trống</span>
                </div>
              )}
            </div>

            {step === 'suggestion' && (
              <>
                <button className="btn-primary rp-submit-btn" onClick={handleConfirmImport}>Xác nhận nhập</button>
                <button className="rp-cancel-link" onClick={() => setStep('manual')}>Điều chỉnh thủ công</button>
                <button className="rp-cancel-link" onClick={() => { onPreviewChange(null); onClose(); }}>Hủy</button>
              </>
            )}

            {step === 'manual' && (
              <>
                <div className="rp-manual-title">Điều chỉnh vị trí thủ công</div>
                {[
                  { label: 'Khu nhập', value: manualZone, setter: (v: string) => { setManualZone(v); handleManualPositionChange(v, manualFloor); }, options: ['Zone A','Zone B','Zone C'] },
                  { label: 'Kho nhập', value: manualWarehouse, setter: setManualWH, options: ['Kho Khô','Kho Lạnh','Kho Hàng dễ vỡ','Kho khác'] },
                  { label: 'Tầng', value: manualFloor, setter: (v: string) => { setManualFloor(v); handleManualPositionChange(manualZone, v); }, options: ['1','2','3'] },
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
                <button className="btn-primary rp-submit-btn" onClick={handleConfirmImport}>Xác nhận nhập</button>
              </>
            )}
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
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null);
  function selectContainer(code: string) { setCode(code); setPanelMode('import'); }
  function closePanel() { setPanelMode(null); setCode(undefined); setPreviewPosition(null); }

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
                <span className="ctn-card-sub">{WAITING_CONTAINERS.length} container đang chờ</span>
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
                ghostPos={previewPosition && previewPosition.whType === wh.id ? { row: previewPosition.row, col: previewPosition.col } : null}
                ghostZone={previewPosition && previewPosition.whType === wh.id ? previewPosition.zone : undefined}
                ghostFloor={previewPosition && previewPosition.whType === wh.id ? previewPosition.floor : undefined}
              />
            ))}
          </div>

          {panelMode === 'waiting-list' && (
            <WaitingListPanel onClose={closePanel} onSelect={selectContainer} />
          )}
          {panelMode === 'import' && (
            <ImportPanel onClose={closePanel} initialCode={selectedCode} onPreviewChange={setPreviewPosition} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import {
  Search, Plus, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Compass,
  Package, Calendar, Truck, Snowflake, AlertTriangle, Layers, Info,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { OverviewScene } from '../components/3d/OverviewScene';
import type { OverviewSceneHandle } from '../components/3d/OverviewScene';
import { Legend } from '../components/ui/Legend';
import {
  WH_STATS, WAITING_CONTAINERS, EXPORT_CONTAINERS,
} from '../data/warehouse';
import type { WHType, ZoneInfo, WHStat, PreviewPosition } from '../data/warehouse';
import {
  findSuggestedPosition, addImportedContainer,
  subscribe, getImportedContainers, cargoTypeToWHType, cargoTypeToWHName,
} from '../data/containerStore';
import type { SuggestedPosition } from '../data/containerStore';
import './WarehouseOverview.css';

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

  // Use real data from store for recent containers
  const imported = useSyncExternalStore(subscribe, getImportedContainers);
  const whTypeMap: Record<string, WHType> = {
    'Kho Lạnh': 'cold', 'Kho Khô': 'dry', 'Kho Hàng dễ vỡ': 'fragile', 'Kho khác': 'other',
  };
  const whType = whTypeMap[zone.type];
  const recentFromStore = whType
    ? imported.filter((c) => c.whType === whType && c.zone === zone.name).slice(0, 5)
    : [];
  // Combine store data with fallback static data
  const recentCodes = recentFromStore.length > 0
    ? recentFromStore.map((c) => `${c.code} (${c.zone} T${c.floor})`)
    : zone.recentContainers;

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
        {recentCodes.length > 0
          ? recentCodes.map((c) => <li key={c}>{c}</li>)
          : <li className="ov-rp-empty-hint">Chưa có container nhập gần đây</li>
        }
      </ul>
    </div>
  );
}

// ─── Waiting list panel ──────────────────────────────────────────────────────
function WaitingListPanel({ onClose, onSelect }: {
  onClose: () => void;
  onSelect: (code: string) => void;
}) {
  return (
    <div className="ov-right-panel">
      <div className="ov-rp-panel-header">
        <button className="ov-rp-back-btn" onClick={onClose}><ChevronLeft size={18} /></button>
        <h2 className="ov-rp-panel-title">Container chờ nhập</h2>
        <span className="ov-rp-badge">{WAITING_CONTAINERS.length}</span>
      </div>
      <div className="ov-rp-panel-body">
        {WAITING_CONTAINERS.map((ctn, idx) => (
          <button key={idx} className="ov-waiting-item" onClick={() => onSelect(ctn.code)}>
            <div className="ov-waiting-icon"><Truck size={18} /></div>
            <div className="ov-waiting-info">
              <span className="ov-waiting-code">{ctn.code}</span>
              <span className="ov-waiting-meta">{ctn.type} &middot; {ctn.date}</span>
            </div>
            <ChevronRight size={16} className="ov-waiting-chevron" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Export panel ────────────────────────────────────────────────────────────
type ExportStep = 'search' | 'confirm';

function ExportPanel({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ExportStep>('search');
  const [searchCode, setSearchCode] = useState('');
  const [selectedExport, setSelectedExport] = useState<typeof EXPORT_CONTAINERS[0] | null>(null);

  const filtered = searchCode.trim()
    ? EXPORT_CONTAINERS.filter(c => c.code.toLowerCase().includes(searchCode.toLowerCase()))
    : EXPORT_CONTAINERS;

  function selectForExport(ctn: typeof EXPORT_CONTAINERS[0]) {
    setSelectedExport(ctn);
    setStep('confirm');
  }

  return (
    <div className="ov-right-panel">
      <div className="ov-rp-panel-header">
        <button className="ov-rp-back-btn" onClick={step === 'confirm' ? () => setStep('search') : onClose}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="ov-rp-panel-title">Xuất Container</h2>
      </div>
      <div className="ov-rp-panel-body">
        {step === 'search' && (
          <>
            <div className="ov-rp-field">
              <label>Tìm container xuất kho</label>
              <div className="ov-rp-search-input">
                <Search size={14} className="ov-rp-search-ico" />
                <input
                  type="text"
                  placeholder="Nhập mã container..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                />
              </div>
            </div>
            <div className="ov-rp-list-label">Container trong kho ({filtered.length})</div>
            {filtered.map((ctn, idx) => (
              <button key={idx} className="ov-waiting-item" onClick={() => selectForExport(ctn)}>
                <div className="ov-waiting-icon ov-export-icon"><LogOut size={18} /></div>
                <div className="ov-waiting-info">
                  <span className="ov-waiting-code">{ctn.code}</span>
                  <span className="ov-waiting-meta">{ctn.type} &middot; {ctn.zone}</span>
                </div>
                <ChevronRight size={16} className="ov-waiting-chevron" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="ov-rp-empty">Không tìm thấy container</p>
            )}
          </>
        )}

        {step === 'confirm' && selectedExport && (
          <>
            <div className="ov-rp-suggestion-card">
              <div className="ov-rp-sug-header">
                <div className="ov-rp-sug-icon"><LogOut size={16} /></div>
                <span className="ov-rp-sug-title">Thông tin xuất kho</span>
              </div>
              <div className="ov-rp-sug-row">
                <span className="ov-rp-sug-label">Mã container</span>
                <span className="ov-rp-sug-value ov-rp-blue">{selectedExport.code}</span>
              </div>
              <div className="ov-rp-sug-row">
                <span className="ov-rp-sug-label">Loại hàng</span>
                <span className="ov-rp-sug-value">{selectedExport.type}</span>
              </div>
              <div className="ov-rp-sug-row">
                <span className="ov-rp-sug-label">Vị trí hiện tại</span>
                <span className="ov-rp-sug-value ov-rp-blue">
                  {selectedExport.zone} - {selectedExport.wh}<br />
                  Tầng {selectedExport.floor} - {selectedExport.slot}
                </span>
              </div>
              <div className="ov-rp-sug-row">
                <span className="ov-rp-sug-label">Container đảo chuyển</span>
                <span className="ov-rp-sug-value ov-rp-blue">{selectedExport.floor > 1 ? selectedExport.floor - 1 : 0}</span>
              </div>
            </div>

            <div className="ov-rp-field">
              <label>Phương tiện vận chuyển</label>
              <div className="ov-rp-select-wrap">
                <select defaultValue="Xe tải">
                  <option>Xe tải</option>
                  <option>Xe nâng</option>
                  <option>Xe đầu kéo</option>
                </select>
              </div>
            </div>
            <div className="ov-rp-field">
              <label>Ghi chú</label>
              <input type="text" placeholder="Nhập ghi chú (tùy chọn)..." className="ov-rp-input" />
            </div>

            <button className="btn-primary ov-rp-submit-btn" onClick={onClose}>
              Xác nhận xuất kho
            </button>
            <button className="ov-rp-cancel-link" onClick={() => setStep('search')}>Quay lại</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Import panel ────────────────────────────────────────────────────────────
type ImportStep = 'form' | 'suggestion' | 'manual';

function ImportPanel({ onClose, initialCode, onPreviewChange }: {
  onClose: () => void;
  initialCode?: string;
  onPreviewChange: (pos: PreviewPosition | null) => void;
}) {
  const [step, setStep] = useState<ImportStep>('form');
  const [form, setForm] = useState({
    containerCode: initialCode ?? '',
    cargoType: 'Hàng Khô',
    sizeType: '20ft' as '20ft' | '40ft',
    weight: '',
    exportDate: '',
    priority: 'Trung bình',
  });
  const [suggestion, setSuggestion] = useState<SuggestedPosition | null>(null);
  const [manualZone, setManualZone]      = useState('Zone A');
  const [manualWarehouse, setManualWH]   = useState('Kho Khô');
  const [manualFloor, setManualFloor]    = useState('1');
  const [manualPos, setManualPos]        = useState('CT01');

  // Clear preview on unmount
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
      // Show ghost preview in 3D/2D
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
    const row = suggestion?.row ?? 0;
    const col = suggestion?.col ?? 0;
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
      row,
      col,
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
    <div className="ov-right-panel">
      <div className="ov-rp-panel-header">
        <button className="ov-rp-back-btn" onClick={step === 'form' ? () => { onPreviewChange(null); onClose(); } : () => { setStep('form'); onPreviewChange(null); }}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="ov-rp-panel-title">Nhập Container</h2>
      </div>
      <div className="ov-rp-panel-body">
        {step === 'form' && (
          <>
            <div className="ov-rp-field">
              <label>Mã số container</label>
              <input type="text" value={form.containerCode} placeholder="VD: CTN-2026-1234"
                onChange={(e) => setForm({ ...form, containerCode: e.target.value })} className="ov-rp-input" />
            </div>
            <div className="ov-rp-field">
              <label>Loại hàng</label>
              <div className="ov-rp-select-wrap">
                <select value={form.cargoType}
                  onChange={(e) => setForm({ ...form, cargoType: e.target.value })}>
                  <option>Hàng Khô</option><option>Hàng Lạnh</option>
                  <option>Hàng dễ vỡ</option><option>Khác</option>
                </select>
              </div>
            </div>
            <div className="ov-rp-field">
              <label>Loại container</label>
              <div className="ov-rp-size-toggle">
                <button type="button"
                  className={`ov-rp-size-btn ${form.sizeType === '20ft' ? 'ov-rp-size-btn-active' : ''}`}
                  onClick={() => setForm({ ...form, sizeType: '20ft' })}>
                  20ft
                </button>
                <button type="button"
                  className={`ov-rp-size-btn ${form.sizeType === '40ft' ? 'ov-rp-size-btn-active' : ''}`}
                  onClick={() => setForm({ ...form, sizeType: '40ft' })}>
                  40ft
                </button>
              </div>
            </div>
            <div className="ov-rp-field">
              <label>Trọng lượng</label>
              <input type="text" value={form.weight} placeholder="VD: 25 tấn"
                onChange={(e) => setForm({ ...form, weight: e.target.value })} className="ov-rp-input" />
            </div>
            <div className="ov-rp-field">
              <label>Ngày xuất (dự kiến)</label>
              <div className="ov-rp-date-wrap">
                <Calendar size={15} className="ov-rp-date-icon" />
                <input type="date" value={form.exportDate}
                  onChange={(e) => setForm({ ...form, exportDate: e.target.value })} />
              </div>
            </div>
            <div className="ov-rp-field">
              <label>Mức độ ưu tiên</label>
              <div className="ov-rp-select-wrap">
                <select value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Cao</option><option>Trung bình</option><option>Thấp</option>
                </select>
              </div>
            </div>
            <button className="btn-primary ov-rp-submit-btn" onClick={handleGetSuggestion}>
              Nhận gợi ý vị trí
            </button>
          </>
        )}

        {(step === 'suggestion' || step === 'manual') && (
          <>
            <div className="ov-rp-suggestion-card">
              <div className="ov-rp-sug-header">
                <div className="ov-rp-sug-icon"><Info size={16} /></div>
                <span className="ov-rp-sug-title">Gợi ý vị trí</span>
              </div>
              {suggestion ? (
                <>
                  <div className="ov-rp-sug-row">
                    <span className="ov-rp-sug-label">Kho</span>
                    <span className="ov-rp-sug-value ov-rp-blue">{suggestion.whName}</span>
                  </div>
                  <div className="ov-rp-sug-row">
                    <span className="ov-rp-sug-label">Vị trí</span>
                    <span className="ov-rp-sug-value ov-rp-blue">{suggestion.zone} - Tầng {suggestion.floor} - {suggestion.slot}</span>
                  </div>
                  <div className="ov-rp-sug-row">
                    <span className="ov-rp-sug-label">Hiệu quả tối ưu</span>
                    <span className="ov-rp-sug-value ov-rp-blue">{suggestion.efficiency}%</span>
                  </div>
                  <div className="ov-rp-sug-row">
                    <span className="ov-rp-sug-label">Container đảo chuyển</span>
                    <span className="ov-rp-sug-value ov-rp-blue">{suggestion.moves}</span>
                  </div>
                </>
              ) : (
                <div className="ov-rp-sug-row">
                  <span className="ov-rp-sug-label">Không tìm thấy vị trí trống phù hợp</span>
                </div>
              )}
            </div>

            {step === 'suggestion' && (
              <>
                <button className="btn-primary ov-rp-submit-btn" onClick={handleConfirmImport}>
                  Xác nhận nhập
                </button>
                <button className="ov-rp-cancel-link" onClick={() => setStep('manual')}>Điều chỉnh thủ công</button>
                <button className="ov-rp-cancel-link" onClick={() => { onPreviewChange(null); onClose(); }}>Hủy</button>
              </>
            )}

            {step === 'manual' && (
              <>
                <div className="ov-rp-manual-title">Điều chỉnh vị trí thủ công</div>
                {[
                  { label: 'Khu nhập', value: manualZone, setter: (v: string) => { setManualZone(v); handleManualPositionChange(v, manualFloor); }, options: ['Zone A','Zone B','Zone C'] },
                  { label: 'Kho nhập', value: manualWarehouse, setter: setManualWH, options: ['Kho Khô','Kho Lạnh','Kho Hàng dễ vỡ','Kho khác'] },
                  { label: 'Tầng', value: manualFloor, setter: (v: string) => { setManualFloor(v); handleManualPositionChange(manualZone, v); }, options: ['1','2','3'] },
                ].map(({ label, value, setter, options }) => (
                  <div key={label} className="ov-rp-field">
                    <label>{label}</label>
                    <div className="ov-rp-select-wrap">
                      <select value={value} onChange={(e) => setter(e.target.value)}>
                        {options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <div className="ov-rp-field">
                  <label>Vị trí</label>
                  <input type="text" value={manualPos}
                    onChange={(e) => setManualPos(e.target.value)} className="ov-rp-input" />
                </div>
                <button className="btn-primary ov-rp-submit-btn" onClick={handleConfirmImport}>Xác nhận nhập</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
type PanelMode = null | 'zone' | 'waiting-list' | 'import' | 'export';

export function WarehouseOverview() {
  const [panelMode, setPanelMode]        = useState<PanelMode>(null);
  const [selectedZone, setSelectedZone]  = useState<ZoneInfo | null>(null);
  const [selectedCode, setSelectedCode]  = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm]      = useState('');
  const [previewPosition, setPreviewPosition] = useState<PreviewPosition | null>(null);
  const sceneRef = useRef<OverviewSceneHandle>(null);
  const navigate = useNavigate();

  function handleZoneClick(zone: ZoneInfo) {
    setSelectedZone(zone);
    setPanelMode('zone');
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedZone(null);
    setSelectedCode(undefined);
    setPreviewPosition(null);
  }

  function openWaiting() {
    setPanelMode('waiting-list');
    setSelectedZone(null);
  }

  function selectContainer(code: string) {
    setSelectedCode(code);
    setPanelMode('import');
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
          {panelMode === null && (
            <button className="ov-ctn-card" onClick={openWaiting}>
              <div className="ov-ctn-card-icon"><Truck size={20} /></div>
              <div className="ov-ctn-card-text">
                <span className="ov-ctn-card-label">Container chờ nhập kho</span>
                <span className="ov-ctn-card-sub">{WAITING_CONTAINERS.length} container đang chờ</span>
              </div>
              <ChevronRight size={17} className="ov-ctn-card-chevron" />
            </button>
          )}
          <div className="ov-spacer" />
          <div className="ov-search">
            <Search size={15} className="ov-search-icon" />
            <input type="text" placeholder="Tìm kiếm kho / container..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button className="btn-primary ov-import-btn" onClick={() => setPanelMode('import')}>
            <Plus size={17} /><span>Nhập kho</span>
          </button>
          <button className="ov-export-btn" onClick={() => setPanelMode('export')}>
            <LogOut size={17} /><span>Xuất kho</span>
          </button>
        </div>

        {/* ── Content row: 3D canvas + right panel ── */}
        <div className="ov-content-row">
          <div className="ov-canvas-wrap">
            <OverviewScene ref={sceneRef} onZoneClick={handleZoneClick}
              highlightId={searchTerm.trim() || undefined}
              previewPosition={previewPosition} />
            <div className="ov-controls">
              <button className="ov-ctrl-btn" aria-label="Zoom in"   onClick={() => sceneRef.current?.zoomIn()}>   <ZoomIn  size={18} /></button>
              <button className="ov-ctrl-btn" aria-label="Zoom out"  onClick={() => sceneRef.current?.zoomOut()}>  <ZoomOut size={18} /></button>
              <button className="ov-ctrl-btn ov-ctrl-btn-primary" aria-label="Reset view" onClick={() => sceneRef.current?.resetView()}><Compass size={18} /></button>
            </div>
          </div>

          {panelMode === 'zone' && selectedZone && <ZoneInfoPanel zone={selectedZone} />}
          {panelMode === 'waiting-list' && (
            <WaitingListPanel onClose={closePanel} onSelect={selectContainer} />
          )}
          {panelMode === 'import' && (
            <ImportPanel onClose={closePanel} initialCode={selectedCode} onPreviewChange={setPreviewPosition} />
          )}
          {panelMode === 'export' && (
            <ExportPanel onClose={closePanel} />
          )}
        </div>

        {/* ── Legend ── */}
        <div className="ov-legend-row"><Legend /></div>
      </div>
    </DashboardLayout>
  );
}

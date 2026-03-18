import { useState, useCallback } from 'react';
import {
  Snowflake, ChevronLeft, ChevronRight, ChevronDown,
  Layers, Thermometer, X,
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import './ColdStorage.css';

// ─── Types & Data ─────────────────────────────────────────────────────────────

interface Container {
  id: string;
  label: string;
  type: '20ft' | '40ft';
  active: boolean;
  cargo?: string;
  weight?: string;
  exportDate?: string;
  temperature?: number;
}

interface Zone {
  name: string;
  containers: Container[][];  // rows of containers
}

const ZONES: Zone[] = [
  {
    name: 'Zone A',
    containers: generateZoneContainers(0),
  },
  {
    name: 'Zone B',
    containers: generateZoneContainers(1),
  },
  {
    name: 'Zone C',
    containers: generateZoneContainers(2),
  },
  {
    name: 'Zone D',
    containers: generateZoneContainers(3),
  },
];

const TOTAL_FLOORS = 3;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateZoneContainers(zoneSeed: number): Container[][] {
  const rows: Container[][] = [];
  let idx = 0;

  // 4 rows: each row has a left group (20ft) and right group (40ft)
  for (let r = 0; r < 4; r++) {
    const row: Container[] = [];

    // Left group: 4 x 20ft containers (arranged as 2 pairs)
    for (let c = 0; c < 4; c++) {
      const active = seededRandom(zoneSeed * 100 + r * 10 + c + idx) < 0.88;
      row.push({
        id: `z${zoneSeed}-r${r}-c${c}`,
        label: 'CT01',
        type: '20ft',
        active,
        cargo: active ? ['Thủy sản', 'Thịt đông lạnh', 'Rau củ', 'Trái cây'][Math.floor(seededRandom(idx + 50) * 4)] : undefined,
        weight: active ? `${Math.floor(seededRandom(idx + 70) * 20 + 5)} tấn` : undefined,
        exportDate: active ? '2026-04-15' : undefined,
        temperature: active ? Math.floor(seededRandom(idx + 90) * 10 - 5) : undefined,
      });
      idx++;
    }

    // Right group: 4 x 40ft containers (arranged as 2 pairs)
    for (let c = 0; c < 4; c++) {
      const active = seededRandom(zoneSeed * 200 + r * 10 + c + idx + 50) < 0.82;
      row.push({
        id: `z${zoneSeed}-r${r}-c${c + 4}`,
        label: 'CT01',
        type: '40ft',
        active,
        cargo: active ? ['Thủy sản', 'Kem', 'Vaccine', 'Sữa'][Math.floor(seededRandom(idx + 150) * 4)] : undefined,
        weight: active ? `${Math.floor(seededRandom(idx + 170) * 25 + 10)} tấn` : undefined,
        exportDate: active ? '2026-05-20' : undefined,
        temperature: active ? Math.floor(seededRandom(idx + 190) * 10 - 5) : undefined,
      });
      idx++;
    }

    rows.push(row);
  }

  return rows;
}

// ─── Container Detail Modal ───────────────────────────────────────────────────

function ContainerDetail({ container, onClose }: { container: Container; onClose: () => void }) {
  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cs-modal-header">
          <h3>Container {container.label}</h3>
          <button className="cs-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="cs-modal-body">
          <div className="cs-detail-row">
            <span className="cs-detail-label">Mã container</span>
            <span className="cs-detail-value">{container.id}</span>
          </div>
          <div className="cs-detail-row">
            <span className="cs-detail-label">Loại</span>
            <span className="cs-detail-value">{container.type}</span>
          </div>
          <div className="cs-detail-row">
            <span className="cs-detail-label">Trạng thái</span>
            <span className={`cs-detail-badge ${container.active ? 'cs-badge-active' : 'cs-badge-inactive'}`}>
              {container.active ? 'Hoạt động' : 'Trống'}
            </span>
          </div>
          {container.active && (
            <>
              <div className="cs-detail-row">
                <span className="cs-detail-label">Hàng hóa</span>
                <span className="cs-detail-value">{container.cargo}</span>
              </div>
              <div className="cs-detail-row">
                <span className="cs-detail-label">Trọng lượng</span>
                <span className="cs-detail-value">{container.weight}</span>
              </div>
              <div className="cs-detail-row">
                <span className="cs-detail-label">Nhiệt độ</span>
                <span className="cs-detail-value">{container.temperature}°C</span>
              </div>
              <div className="cs-detail-row">
                <span className="cs-detail-label">Ngày xuất</span>
                <span className="cs-detail-value">{container.exportDate}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Container Slot ───────────────────────────────────────────────────────────

function ContainerSlot({ container, onClick }: { container: Container; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="cs-slot-wrapper">
      <div
        className={`cs-slot ${container.type === '40ft' ? 'cs-slot-40' : 'cs-slot-20'} ${container.active ? 'cs-slot-active' : 'cs-slot-empty'}`}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {container.label}
      </div>
      {hovered && container.active && (
        <div className="cs-tooltip">
          <div className="cs-tooltip-row"><strong>{container.cargo}</strong></div>
          <div className="cs-tooltip-row">{container.weight} · {container.temperature}°C</div>
          <div className="cs-tooltip-row">Xuất: {container.exportDate}</div>
        </div>
      )}
    </div>
  );
}

// ─── Rack (2-column pair) ─────────────────────────────────────────────────────

function Rack({ containers, onSelect }: {
  containers: Container[];
  onSelect: (c: Container) => void;
}) {
  return (
    <div className="cs-rack">
      {containers.map((c) => (
        <ContainerSlot key={c.id} container={c} onClick={() => onSelect(c)} />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ColdStorage() {
  const [zoneIdx, setZoneIdx] = useState(0);
  const [floor, setFloor] = useState(1);
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);

  const zone = ZONES[zoneIdx];

  const prevZone = useCallback(() => {
    setAnimDir('left');
    setZoneIdx((i) => (i - 1 + ZONES.length) % ZONES.length);
    setTimeout(() => setAnimDir(null), 350);
  }, []);

  const nextZone = useCallback(() => {
    setAnimDir('right');
    setZoneIdx((i) => (i + 1) % ZONES.length);
    setTimeout(() => setAnimDir(null), 350);
  }, []);

  const selectZone = useCallback((idx: number) => {
    setAnimDir('right');
    setZoneIdx(idx);
    setZoneDropdownOpen(false);
    setTimeout(() => setAnimDir(null), 350);
  }, []);

  // Split each row into left (20ft, indices 0-3) and right (40ft, indices 4-7)
  // Then pair them: left pairs = [0,1], [2,3] and right pairs = [4,5], [6,7]
  // Group rows: top group = rows 0,1; bottom group = rows 2,3

  const rowGroups = [zone.containers.slice(0, 2), zone.containers.slice(2, 4)];

  return (
    <DashboardLayout>
      <div className="cs-page">
        <div className="cs-card">
          {/* Header */}
          <div className="cs-header">
            <div className="cs-header-left">
              <Snowflake size={22} className="cs-snow-icon" />
              <span className="cs-title">Kho Lạnh</span>
            </div>
            <span className="cs-status">Active</span>
          </div>

          <div className="cs-divider" />

          {/* Zone selector */}
          <div className="cs-zone-selector-wrap">
            <button
              className="cs-zone-btn"
              onClick={() => setZoneDropdownOpen(!zoneDropdownOpen)}
            >
              {zone.name} <ChevronDown size={14} className={`cs-zone-chevron ${zoneDropdownOpen ? 'cs-zone-chevron-open' : ''}`} />
            </button>
            {zoneDropdownOpen && (
              <div className="cs-zone-dropdown">
                {ZONES.map((z, i) => (
                  <button
                    key={z.name}
                    className={`cs-zone-option ${i === zoneIdx ? 'cs-zone-option-active' : ''}`}
                    onClick={() => selectZone(i)}
                  >
                    {z.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid area */}
          <div className="cs-grid-area">
            <button className="cs-nav-btn" onClick={prevZone}>
              <ChevronLeft size={18} />
            </button>

            <div className={`cs-container-grid ${animDir === 'left' ? 'cs-slide-left' : animDir === 'right' ? 'cs-slide-right' : ''}`}>
              {rowGroups.map((group, gi) => (
                <div key={gi} className="cs-row-group">
                  {/* Left block: 20ft containers */}
                  <div className="cs-block cs-block-20">
                    {group.map((row, ri) => (
                      <div key={ri} className="cs-block-row">
                        {/* Pair 1: cols 0,1 */}
                        <Rack
                          containers={[row[0], row[1]]}
                          onSelect={setSelectedContainer}
                        />
                        {/* Pair 2: cols 2,3 */}
                        <Rack
                          containers={[row[2], row[3]]}
                          onSelect={setSelectedContainer}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Gap between 20ft and 40ft */}
                  <div className="cs-block-gap" />

                  {/* Right block: 40ft containers */}
                  <div className="cs-block cs-block-40">
                    {group.map((row, ri) => (
                      <div key={ri} className="cs-block-row">
                        {/* Pair 1: cols 4,5 */}
                        <Rack
                          containers={[row[4], row[5]]}
                          onSelect={setSelectedContainer}
                        />
                        {/* Pair 2: cols 6,7 */}
                        <Rack
                          containers={[row[6], row[7]]}
                          onSelect={setSelectedContainer}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="cs-nav-btn" onClick={nextZone}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Footer */}
          <div className="cs-footer">
            <div className="cs-footer-left">
              <Layers size={14} />
              <span>Tầng {floor}/{TOTAL_FLOORS}</span>
              <div className="cs-floor-btns">
                <button
                  className="cs-floor-btn"
                  disabled={floor <= 1}
                  onClick={() => setFloor((f) => Math.max(1, f - 1))}
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  className="cs-floor-btn"
                  disabled={floor >= TOTAL_FLOORS}
                  onClick={() => setFloor((f) => Math.min(TOTAL_FLOORS, f + 1))}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
            <div className="cs-footer-right">
              <Thermometer size={14} />
              <span>18 độ C</span>
            </div>
          </div>
        </div>

        {/* Detail modal */}
        {selectedContainer && (
          <ContainerDetail
            container={selectedContainer}
            onClose={() => setSelectedContainer(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

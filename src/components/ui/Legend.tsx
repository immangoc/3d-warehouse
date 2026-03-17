import './Legend.css';

const legendItems = [
  { label: 'Kho Khô', color: 'var(--status-dry)' },
  { label: 'Kho Hàng dễ vỡ', color: 'var(--status-fragile)' },
  { label: 'Kho Lạnh', color: 'var(--status-cold)' },
  { label: 'Kho khác', color: 'var(--status-other)' },
];

export function Legend() {
  return (
    <div className="legend-container">
      {legendItems.map((item, index) => (
        <div key={index} className="legend-item">
          <div className="legend-color" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

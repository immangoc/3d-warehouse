import './Legend.css';

const legendItems = [
  { label: 'Kho Khô', color: 'var(--status-dry)' },
  { label: 'Kho Lạnh', color: 'var(--status-cold)' },
  { label: 'Hàng dễ vỡ / hỏng', color: 'var(--status-fragile)' },
  { label: 'Khác', color: 'var(--status-other)' },
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

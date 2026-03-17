import { Bell, Search, Globe, Plus } from 'lucide-react';
import './Topbar.css';

export function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="breadcrumbs">
          <span className="breadcrumb-item">Home</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item">Điều độ bãi & Tối ưu hóa</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">Sơ đồ 3D trực quan</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Nhập mã số Container..." 
            className="search-input"
          />
        </div>

        <div className="topbar-actions">
          <button className="icon-btn language-btn">
            <Globe size={18} />
            <span>Tiếng Việt</span>
          </button>
          
          <button className="icon-btn notification-btn">
            <Bell size={20} />
            <span className="notif-badge">3</span>
          </button>

          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Nhập / Xuất
          </button>
        </div>
      </div>
    </header>
  );
}

import { Bell, MessageCircle, Settings, Home, ChevronRight, ChevronDown, Menu } from 'lucide-react';
import './Topbar.css';

interface TopbarProps {
  onMenuToggle?: () => void;
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="menu-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <nav className="breadcrumbs" aria-label="breadcrumb">
          <span className="breadcrumb-item">
            <Home size={14} className="breadcrumb-home-icon" />
          </span>
          <ChevronRight size={14} className="breadcrumb-chevron" />
          <span className="breadcrumb-item">Điều độ bãi & Tối ưu hóa</span>
          <ChevronRight size={14} className="breadcrumb-chevron" />
          <span className="breadcrumb-item active">Sơ đồ 3D trực quan</span>
        </nav>
      </div>

      <div className="topbar-right">
        <button className="icon-btn language-btn">
          <span className="flag-icon">🇻🇳</span>
          <span className="lang-label">Tiếng Việt</span>
          <ChevronDown size={14} />
        </button>

        <div className="topbar-icons">
          <button className="icon-btn notification-btn" aria-label="Notifications">
            <Bell size={20} />
            <span className="notif-badge">3</span>
          </button>

          <button className="icon-btn" aria-label="Messages">
            <MessageCircle size={20} />
          </button>

          <button className="icon-btn" aria-label="Settings">
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

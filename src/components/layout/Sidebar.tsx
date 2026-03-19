import {
  LayoutDashboard,
  Box,
  Truck,
  ChevronDown,
  AlertTriangle,
  Anchor,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/tong-quan' },
  {
    icon: Box,
    label: 'Điều độ bãi & Tối ưu hóa',
    path: '#',
    subItems: [
      { label: 'Sơ đồ 3D trực quan', path: '/3d' },
      { label: 'Sơ đồ mặt phẳng', path: '/2d' },
    ],
  },
  { icon: Truck, label: 'Quản lý hạ bãi', path: '/ha-bai' },
  { icon: Truck, label: 'Quản lý xuất bãi', path: '/xuat-bai' },
  { icon: Box, label: 'Quản lý Kho & Container', path: '/kho' },
  { icon: AlertTriangle, label: 'Kiểm soát & Sự cố', path: '/kiem-soat' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-placeholder">
          <div className="logo-icon">
            <Anchor size={18} strokeWidth={2.5} />
          </div>
          <div className="logo-text">
            <span className="logo-name">Hùng Thủy</span>
            <span className="logo-sub">Port Logistics</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const hasSub = !!item.subItems;
            const isSubActive =
              hasSub && item.subItems?.some((sub) => location.pathname === sub.path);

            return (
              <li key={index} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    isActive && !hasSub
                      ? 'active-link'
                      : isSubActive
                      ? 'parent-active'
                      : ''
                  }
                >
                  <Icon size={20} className="nav-icon" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {hasSub && <ChevronDown size={16} />}
                </NavLink>

                {hasSub && (
                  <ul className="sub-menu">
                    {item.subItems!.map((sub, sIdx) => (
                      <li key={sIdx}>
                        <NavLink
                          to={sub.path}
                          className={({ isActive }) => (isActive ? 'sub-active' : '')}
                        >
                          {sub.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">P</div>
          <div className="user-info">
            <p className="user-name">Phạm Thị Lan</p>
            <span className="user-role-badge">Vận hành</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

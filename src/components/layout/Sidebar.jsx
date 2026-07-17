import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, Trophy, Dumbbell, BarChart2,
  FileText, Settings, ChevronLeft, ChevronRight, User
} from 'lucide-react';

import { useState } from 'react';

export default function Sidebar() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const userRole = localStorage.getItem('user_role') || 'admin';
  const studentId = localStorage.getItem('user_id') || '1';

  const navItems = userRole === 'admin' 
    ? [
        { to: '/', icon: LayoutDashboard, key: 'dashboard', exact: true },
        { to: '/players', icon: Users, key: 'players' },
        { to: '/matches', icon: Trophy, key: 'matches' },
        { to: '/training', icon: Dumbbell, key: 'training' },
        { to: '/stats', icon: BarChart2, key: 'stats' },
        { to: '/reports', icon: FileText, key: 'reports' },
        { to: '/excel-import', icon: FileText, key: 'excelImport', label: 'Excel İthalatı' },
        { to: '/settings', icon: Settings, key: 'settings' },
      ]
    : [
        { to: `/players/${studentId}`, icon: User, key: 'myProfile', label: 'Profilim' }
      ];


  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏀</div>
        <div className="sidebar-logo-text">
          <h1>{t('app.name')}</h1>
          <p>{t('app.tagline')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">MENÜ</div>
        {navItems.map(({ to, icon: Icon, key, exact, label }) => (
          <NavLink
            key={key}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            data-tooltip={collapsed ? (label || t(`nav.${key}`)) : undefined}
          >
            <span className="nav-link-icon"><Icon size={18} /></span>
            <span className="nav-link-text">{label || t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Genişlet' : 'Daralt'}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span style={{fontSize:'0.75rem'}}>Daralt</span></>}
        </button>
      </div>
    </aside>
  );
}

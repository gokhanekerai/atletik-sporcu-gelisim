import { useTranslation } from 'react-i18next';
import { Search, Bell, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const routeTitles = {
  '/': 'dashboard',
  '/players': 'players',
  '/matches': 'matches',
  '/training': 'training',
  '/stats': 'stats',
  '/reports': 'reports',
  '/settings': 'settings',
};

export default function Header({ onMenuClick }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const pageKey = Object.keys(routeTitles)
    .filter(k => k !== '/')
    .find(k => location.pathname.startsWith(k)) || '/';

  const currentLang = i18n.language;

  const toggleLang = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <header className="top-header">
      <button className="mobile-menu-btn" onClick={onMenuClick} title="Menü">
        <Menu size={20} />
      </button>

      <div className="header-breadcrumb">
        <h2>{t(`nav.${routeTitles[pageKey]}`)}</h2>
      </div>

      <div className="header-actions">
        {/* Search */}
        <div className="header-search">
          <Search size={14} className="header-search-icon" />
          <input type="text" placeholder={t('common.search')} />
        </div>

        {/* Language Toggle */}
        <div className="lang-toggle">
          <button
            className={`lang-btn${currentLang === 'tr' ? ' active' : ''}`}
            onClick={() => toggleLang('tr')}
          >
            TR
          </button>
          <button
            className={`lang-btn${currentLang === 'en' ? ' active' : ''}`}
            onClick={() => toggleLang('en')}
          >
            EN
          </button>
        </div>

        {/* Notification Bell */}
        <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--c-primary)',
            border: '2px solid var(--c-surface)',
          }} />
        </button>

        {/* Avatar / Sign Out */}
        <div 
          onClick={() => {
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_id');
            window.dispatchEvent(new Event('auth-changed'));
            window.location.href = '/';
          }}
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
          title="Çıkış Yap"
        >
          <div className="header-avatar" style={{ background: 'var(--c-primary-dim)', color: 'var(--c-primary)' }}>
            {localStorage.getItem('user_role') === 'super_admin' ? 'SA' : (localStorage.getItem('user_role') === 'admin' ? 'AD' : 'SP')}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--c-text-2)', fontWeight: 600 }}>Çıkış</span>
        </div>
      </div>
    </header>
  );
}


import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Moon, Bell, Database, Shield, Save } from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState(i18n.language || 'tr');
  const [saved, setSaved] = useState(false);
  const [clubName, setClubName] = useState('Yıldızlar Basketbol Kulübü');
  const [season, setSeason] = useState('2025-26');
  const [notifications, setNotifications] = useState({
    matchAlerts: true,
    trainingReminders: true,
    goalAchievements: true,
    weeklyReport: false,
  });

  const handleLangChange = (lang) => {
    setCurrentLang(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('nav.settings')}</h1>
          <p>Uygulama tercihleri ve yapılandırma</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} />
            {saved ? '✅ Kaydedildi!' : 'Kaydet'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 720 }}>
        {/* Club Info */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 36, height: 36, background: 'var(--c-primary-dim)',
                borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--c-primary)',
              }}><Shield size={18} /></div>
              <div>
                <div className="card-title">Kulüp Bilgileri</div>
                <div className="card-subtitle">Kulüp adı ve sezon ayarları</div>
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Kulüp Adı</label>
              <input
                type="text"
                value={clubName}
                onChange={e => setClubName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Aktif Sezon</label>
              <input
                type="text"
                value={season}
                onChange={e => setSeason(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 36, height: 36, background: 'var(--c-accent-dim)',
                borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--c-accent)',
              }}><Globe size={18} /></div>
              <div>
                <div className="card-title">Dil / Language</div>
                <div className="card-subtitle">Arayüz dilini seçin</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            {[
              { code: 'tr', label: '🇹🇷 Türkçe' },
              { code: 'en', label: '🇬🇧 English' },
            ].map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLangChange(lang.code)}
                style={{
                  flex: 1,
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--r-md)',
                  border: `2px solid ${currentLang === lang.code ? 'var(--c-primary)' : 'var(--c-border-2)'}`,
                  background: currentLang === lang.code ? 'var(--c-primary-dim)' : 'var(--c-surface-2)',
                  color: currentLang === lang.code ? 'var(--c-primary)' : 'var(--c-text-2)',
                  fontWeight: currentLang === lang.code ? 700 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all var(--t-fast)',
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 36, height: 36, background: 'rgba(245,158,11,0.15)',
                borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--c-yellow)',
              }}><Bell size={18} /></div>
              <div>
                <div className="card-title">Bildirimler</div>
                <div className="card-subtitle">Uygulama bildirimleri</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              { key: 'matchAlerts', label: 'Maç Uyarıları', desc: 'Yaklaşan maçlar için hatırlatma' },
              { key: 'trainingReminders', label: 'Antrenman Hatırlatmaları', desc: 'Günlük antrenman bildirimleri' },
              { key: 'goalAchievements', label: 'Hedef Tamamlamaları', desc: 'Sporcu hedefine ulaştığında bildir' },
              { key: 'weeklyReport', label: 'Haftalık Rapor', desc: 'Her hafta otomatik özet rapor' },
            ].map(item => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>{item.desc}</div>
                </div>
                <div
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: notifications[item.key] ? 'var(--c-primary)' : 'var(--c-surface-3)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background var(--t-fast)',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 2, left: notifications[item.key] ? 22 : 2,
                    width: 20, height: 20,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left var(--t-fast)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Database */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{
                width: 36, height: 36, background: 'rgba(167,139,250,0.15)',
                borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--c-purple)',
              }}><Database size={18} /></div>
              <div>
                <div className="card-title">Veritabanı Bağlantısı</div>
                <div className="card-subtitle">Supabase entegrasyonu</div>
              </div>
            </div>
          </div>
          <div style={{
            background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 'var(--r-md)', padding: 'var(--space-4)',
            fontSize: '0.875rem', color: 'var(--c-text-2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-yellow)' }} />
              <strong style={{ color: 'var(--c-yellow)' }}>Demo Modu</strong>
            </div>
            Uygulama şu an yerel mock data ile çalışmaktadır. Supabase bağlantısı için URL ve API anahtarlarınızı girin.
          </div>
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Supabase URL</label>
              <input type="text" placeholder="https://xxxx.supabase.co" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Supabase Anon Key</label>
              <input type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
            </div>
            <button className="btn btn-secondary" style={{ width: 'fit-content' }}>
              Bağlantıyı Test Et
            </button>
          </div>
        </div>

        {/* App Info */}
        <div style={{
          textAlign: 'center', padding: 'var(--space-6)',
          color: 'var(--c-text-3)', fontSize: '0.8rem',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🏀</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--c-primary)', marginBottom: 4 }}>
            ATLETİKPLUS v1.0
          </div>
          <div>Basketbol Kulübü Sporcu Gelişim Takip Sistemi</div>
          <div style={{ marginTop: 4, opacity: 0.6 }}>© 2026 · Tüm hakları saklıdır</div>
        </div>
      </div>
    </div>
  );
}

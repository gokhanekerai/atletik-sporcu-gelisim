import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Award, Calendar, ChevronRight, TrendingUp } from 'lucide-react';
import { localDb } from '../lib/supabase';

const initials = name => name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const db = localDb.get();
  const players = (db.profiles || []).filter(p => p.role !== 'admin');

  // Stats computation
  const totalPlayers = players.length;
  const activePlayers = players.filter(p => p.status === 'active').length;
  const injuredPlayers = players.filter(p => p.status === 'injured').length;

  // Categories count
  const u9Count = players.filter(p => p.category === 'U9/U10').length;
  const u12Count = players.filter(p => p.category === 'U12').length;
  const u14Count = players.filter(p => p.category === 'U14').length;

  const latestPlayers = [...players].slice(-4).reverse();

  const statCards = [
    {
      icon: <Users size={20} />,
      color: 'var(--c-primary)',
      bgColor: 'var(--c-primary-dim)',
      label: t('dashboard.cardTotalPlayers'),
      value: totalPlayers,
      desc: t('dashboard.cardTotalPlayersDesc'),
    },
    {
      icon: <Award size={20} />,
      color: 'var(--c-green)',
      bgColor: 'rgba(39, 174, 96, 0.15)',
      label: t('dashboard.cardActivePlayers'),
      value: activePlayers,
      desc: t('dashboard.cardActivePlayersDesc'),
    },
    {
      icon: <FileText size={20} />,
      color: 'var(--c-accent)',
      bgColor: 'var(--c-accent-dim)',
      label: t('dashboard.cardTotalReports'),
      value: (db.coach_reports || []).length,
      desc: t('dashboard.cardTotalReportsDesc'),
    },
    {
      icon: <TrendingUp size={20} />,
      color: 'var(--c-purple)',
      bgColor: 'rgba(167, 139, 250, 0.15)',
      label: t('dashboard.cardTotalMeasurements'),
      value: (db.antropometri || []).length,
      desc: t('dashboard.cardTotalMeasurementsDesc'),
    },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,107,53,0.12) 0%, rgba(78,205,196,0.08) 100%)',
        border: '1px solid rgba(255,107,53,0.2)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--space-8)',
        marginBottom: 'var(--space-8)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -40, right: -20,
          fontSize: 140, opacity: 0.06, lineHeight: 1,
          userSelect: 'none',
        }}>🏀</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ color: 'var(--c-text-2)', fontSize: '0.85rem', marginBottom: 4 }}>
            {t('dashboard.welcome')}, <strong style={{ color: 'var(--c-primary)' }}>{t('dashboard.coach')}</strong> 👋
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.8rem',
            fontWeight: 800, color: 'var(--c-text)', lineHeight: 1.2,
            marginBottom: 'var(--space-2)',
          }}>
            {t('dashboard.title')}
          </h1>
          <p style={{ color: 'var(--c-text-2)', fontSize: '0.9rem' }}>
            {t('dashboard.subtitle', { count: totalPlayers })}
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {statCards.map((card, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-icon" style={{ background: card.bgColor, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-card-value" style={{ color: card.color }}>{card.value}</div>
            <div className="stat-card-label">{card.label}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', marginTop: 4 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        
        {/* Category Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t('dashboard.categoryDistribution')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'U9 / U10 Grubu', count: u9Count, pct: totalPlayers > 0 ? (u9Count / totalPlayers) * 100 : 0, color: 'var(--c-primary)' },
              { label: 'U12 Grubu', count: u12Count, pct: totalPlayers > 0 ? (u12Count / totalPlayers) * 100 : 0, color: 'var(--c-accent)' },
              { label: 'U14 Grubu', count: u14Count, pct: totalPlayers > 0 ? (u14Count / totalPlayers) * 100 : 0, color: 'var(--c-purple)' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: 'var(--c-text-3)' }}>{item.count} {t('dashboard.athlete')} ({Math.round(item.pct)}%)</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Added Players */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t('dashboard.recentlyAdded')}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/players')}>{t('dashboard.viewAll')}</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {latestPlayers.length === 0 ? (
              <div style={{ color: 'var(--c-text-3)', fontSize: '0.8rem', textAlign: 'center', padding: 20 }}>{t('dashboard.noPlayersYet')}</div>
            ) : (
              latestPlayers.map(p => (
                <div 
                  key={p.id} 
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}
                  onClick={() => navigate(`/players/${p.id}`)}
                >
                  <div className="avatar avatar-md" style={{
                    overflow: 'hidden',
                    background: p.avatarUrl ? `url(${p.avatarUrl}) center/cover no-repeat` : undefined
                  }}>
                    {!p.avatarUrl && initials(p.fullName)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.fullName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--c-text-3)' }}>#{p.jerseyNumber} · {p.category} · {p.position}</div>
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--c-text-3)' }} />
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Guide Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--c-surface-2) 0%, rgba(255,107,53,0.02) 100%)', border: '1px solid var(--c-border)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, marginBottom: 8, color: 'var(--c-primary)' }}>
          {t('dashboard.guideTitle')}
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--c-text-2)', lineHeight: 1.6 }}>
          1. <strong>{t('dashboard.addNewAthlete')}</strong>: <a href="#" onClick={(e) => { e.preventDefault(); navigate('/players'); }}>{t('nav.players')}</a> {t('dashboard.guideText1')}<br />
          2. <strong>{t('dashboard.manualInput')}</strong>: {t('dashboard.guideText2')}
        </p>
      </div>
    </div>
  );
}

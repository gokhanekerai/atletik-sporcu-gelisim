import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, Trophy, Activity, TrendingUp,
  ArrowUpRight, ArrowDownRight, Calendar, Star
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { localDb } from '../lib/supabase';
import { getPlayerStats } from '../data/mockData';

const monthlyScores = [
  { month: 'Oca', avg: 78, opp: 72 },
  { month: 'Şub', avg: 82, opp: 75 },
  { month: 'Mar', avg: 79, opp: 80 },
  { month: 'Nis', avg: 88, opp: 71 },
  { month: 'May', avg: 85, opp: 76 },
  { month: 'Haz', avg: 91, opp: 78 },
  { month: 'Tem', avg: 86, opp: 79 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--c-surface-2)', border: '1px solid var(--c-border-2)',
        borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '0.8rem'
      }}>
        <p style={{ color: 'var(--c-text)', fontWeight: 700, marginBottom: 4 }}>{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const db = localDb.get();
  const players = db.profiles || [];
  const teams = db.teams || [];
  const matches = db.matches || [];
  const trainingSessions = db.trainingSessions || [];

  const totalPlayers = players.filter(p => p.status === 'active').length;
  const activeTeams = teams.length;
  const totalMatches = matches.filter(m => m.result).length;
  const wins = matches.filter(m => m.result === 'W').length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  const recentMatches = matches
    .filter(m => m.result)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const upcomingMatches = matches
    .filter(m => !m.result)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3);

  const upcomingSessions = trainingSessions
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  // Top performers
  const topPerformers = players
    .filter(p => p.teamId === 1)
    .map(p => ({ ...p, stats: getPlayerStats(p.id) }))
    .filter(p => p.stats)
    .sort((a, b) => parseFloat(b.stats.ppg) - parseFloat(a.stats.ppg))
    .slice(0, 4);

  const statCards = [
    {
      icon: <Users size={20} />,
      color: 'var(--c-primary)',
      bgColor: 'var(--c-primary-dim)',
      label: t('dashboard.totalPlayers'),
      value: totalPlayers,
      change: '+2',
      up: true,
    },
    {
      icon: <Trophy size={20} />,
      color: 'var(--c-accent)',
      bgColor: 'var(--c-accent-dim)',
      label: t('dashboard.activeTeams'),
      value: activeTeams,
      change: 'Sezon 2025-26',
      up: null,
    },
    {
      icon: <Activity size={20} />,
      color: 'var(--c-purple)',
      bgColor: 'rgba(167,139,250,0.15)',
      label: t('dashboard.matchesThisSeason'),
      value: totalMatches,
      change: `${wins} Galibiyet`,
      up: true,
    },
    {
      icon: <TrendingUp size={20} />,
      color: 'var(--c-yellow)',
      bgColor: 'rgba(245,158,11,0.15)',
      label: 'Galibiyet Oranı',
      value: `${winRate}%`,
      change: '+5% geçen aya göre',
      up: true,
    },
  ];

  const initials = name => name.split(' ').map(n => n[0]).join('').slice(0, 2);

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
            {t('dashboard.welcome')}, <strong style={{ color: 'var(--c-primary)' }}>Antrenör</strong> 👋
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.8rem',
            fontWeight: 800, color: 'var(--c-text)', lineHeight: 1.2,
            marginBottom: 'var(--space-2)',
          }}>
            BasketTrack'e Hoş Geldiniz
          </h1>
          <p style={{ color: 'var(--c-text-2)', fontSize: '0.9rem' }}>
            Sezon 2025-26 • {totalPlayers} aktif sporcu • {activeTeams} takım
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
            {card.change && (
              <div className={`stat-card-change ${card.up === true ? 'change-up' : card.up === false ? 'change-down' : ''}`}>
                {card.up === true && <ArrowUpRight size={12} />}
                {card.up === false && <ArrowDownRight size={12} />}
                <span style={{ color: card.up === null ? 'var(--c-text-3)' : undefined }}>{card.change}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        {/* Score Trend */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Aylık Skor Trendi</div>
              <div className="card-subtitle">Takım ortalaması vs rakip</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyScores}>
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOpp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} domain={[60, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="avg" name="Takım" stroke="#FF6B35" strokeWidth={2} fill="url(#colorAvg)" />
              <Area type="monotone" dataKey="opp" name="Rakip" stroke="#4ECDC4" strokeWidth={2} fill="url(#colorOpp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Maç Sonuçları</div>
              <div className="card-subtitle">Son 7 maç dağılımı</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'Galibiyet', value: wins, color: 'var(--c-green)' },
              { label: 'Mağlubiyet', value: matches.filter(m => m.result === 'L').length, color: 'var(--c-red)' },
              { label: 'Beraberlik', value: matches.filter(m => m.result === 'D').length, color: 'var(--c-yellow)' },
            ].map(item => (
              <div key={item.label} style={{
                flex: 1, background: 'var(--c-surface-2)',
                borderRadius: 'var(--r-md)', padding: 'var(--space-3)',
                textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '1.5rem',
                  fontWeight: 800, color: item.color,
                }}>{item.value}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>{item.label}</div>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={recentMatches.map(m => ({
              name: m.opponent.split(' ')[0],
              result: m.result === 'W' ? 1 : m.result === 'L' ? -1 : 0,
              color: m.result === 'W' ? '#34D399' : m.result === 'L' ? '#F87171' : '#F59E0B',
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={({ active, payload }) => active && payload?.length ? (
                <div style={{
                  background: 'var(--c-surface-2)', border: '1px solid var(--c-border-2)',
                  borderRadius: 'var(--r-sm)', padding: '6px 10px', fontSize: '0.75rem'
                }}>
                  {payload[0].payload.result === 1 ? '✅ Galibiyet' : payload[0].payload.result === -1 ? '❌ Mağlubiyet' : '🤝 Beraberlik'}
                </div>
              ) : null} />
              <Bar dataKey="result" radius={[4, 4, 0, 0]}
                fill="#34D399"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-1-2" style={{ marginBottom: 'var(--space-8)' }}>
        {/* Recent Matches */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t('dashboard.recentMatches')}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/matches')}>
              Tümü →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentMatches.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3)', background: 'var(--c-surface-2)',
                borderRadius: 'var(--r-md)',
              }}>
                <div className={`match-result-badge result-${m.result}`}>
                  {m.result}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-text)' }}>
                    {m.opponent}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>
                    {m.homeAway === 'home' ? '🏟️ İç Saha' : '✈️ Deplasman'} · {m.date}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: '0.95rem', color: 'var(--c-text)',
                }}>
                  {m.score}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t('dashboard.topPerformers')}</div>
            <Star size={16} style={{ color: 'var(--c-yellow)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {topPerformers.map((p, idx) => {
              const s = p.stats;
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                    padding: 'var(--space-3)', background: 'var(--c-surface-2)',
                    borderRadius: 'var(--r-md)', cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/players/${p.id}`)}
                >
                  <div style={{
                    width: 24, textAlign: 'center', fontFamily: 'var(--font-display)',
                    fontWeight: 800, color: idx === 0 ? 'var(--c-yellow)' : 'var(--c-text-3)',
                    fontSize: '0.85rem',
                  }}>#{idx + 1}</div>
                  <div className="avatar avatar-md">{initials(p.fullName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.fullName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>
                      #{p.jerseyNumber} · {p.position}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', textAlign: 'center' }}>
                    {[
                      { val: s.ppg, lbl: 'PTN' },
                      { val: s.rpg, lbl: 'RBD' },
                      { val: s.apg, lbl: 'AST' },
                    ].map(st => (
                      <div key={st.lbl}>
                        <div style={{
                          fontFamily: 'var(--font-display)', fontWeight: 800,
                          fontSize: '1rem', color: 'var(--c-primary)',
                        }}>{st.val}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--c-text-3)' }}>{st.lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">{t('dashboard.upcomingTraining')}</div>
          <Calendar size={16} style={{ color: 'var(--c-text-3)' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          {upcomingSessions.map(s => {
            const team = teams.find(t => t.id === s.teamId);
            return (
              <div key={s.id} style={{
                flex: '1 1 200px', background: 'var(--c-surface-2)',
                borderRadius: 'var(--r-lg)', padding: 'var(--space-4)',
                border: '1px solid var(--c-border)',
              }}>
                <div style={{
                  fontSize: '0.7rem', fontWeight: 700, color: 'var(--c-primary)',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
                }}>{s.type}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{team?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', display: 'flex', gap: 8 }}>
                  <span>📅 {s.date}</span>
                  <span>⏱ {s.durationMinutes} dk</span>
                </div>
                {s.notes && (
                  <div style={{
                    fontSize: '0.75rem', color: 'var(--c-text-2)', marginTop: 6,
                    padding: '4px 8px', background: 'var(--c-surface-3)',
                    borderRadius: 'var(--r-sm)',
                  }}>{s.notes}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Plus, ChevronRight } from 'lucide-react';
import { localDb } from '../lib/supabase';
import { getPlayerStats } from '../data/mockData';

const posColors = {
  PG: 'orange', SG: 'teal', SF: 'purple', PF: 'yellow', C: 'green'
};

const initials = name => name.split(' ').map(n => n[0]).join('').slice(0, 2);

export default function Players() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  const [posFilter, setPosFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const db = localDb.get();
  const players = db.profiles || [];
  const teams = db.teams || [];

  const filtered = players.filter(p => {
    const matchName = p.fullName.toLowerCase().includes(search.toLowerCase());
    const matchTeam = teamFilter === 'all' || p.teamId === parseInt(teamFilter);
    const matchPos = posFilter === 'all' || p.position === posFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchName && matchTeam && matchPos && matchStatus;
  });

  const getAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('nav.players')}</h1>
          <p>{filtered.length} sporcu listelendi</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary">
            <Plus size={16} /> {t('common.add')} Sporcu
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-3)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select className="filter-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="all">{t('common.all')} Takımlar</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="filter-select" value={posFilter} onChange={e => setPosFilter(e.target.value)}>
          <option value="all">{t('common.all')} Mevkiler</option>
          {['PG','SG','SF','PF','C'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">{t('common.all')}</option>
          <option value="active">{t('player.active')}</option>
          <option value="injured">{t('player.injured')}</option>
          <option value="inactive">{t('player.inactive')}</option>
        </select>
      </div>

      {/* Player Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏀</div>
          <p>{t('common.noData')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(player => {
            const stats = getPlayerStats(player.id);
            const team = teams.find(t => t.id === player.teamId);
            const age = getAge(player.birthDate);

            return (
              <div
                key={player.id}
                className="player-card"
                onClick={() => navigate(`/players/${player.id}`)}
              >
                {/* Jersey Number */}
                <div style={{
                  width: 36, textAlign: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 900,
                  fontSize: '1.1rem', color: 'var(--c-text-3)',
                }}>
                  #{player.jerseyNumber}
                </div>

                {/* Avatar */}
                <div className="avatar avatar-lg">{initials(player.fullName)}</div>

                {/* Info */}
                <div className="player-card-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                    <div className="player-card-name">{player.fullName}</div>
                    <div className={`pos-chip pos-${player.position}`}>{player.position}</div>
                    <div className={`badge badge-${player.status === 'active' ? 'green' : player.status === 'injured' ? 'red' : 'yellow'}`}>
                      {player.status === 'active' ? '● Aktif' : player.status === 'injured' ? '⚠ Sakatlanmış' : '○ Pasif'}
                    </div>
                  </div>
                  <div className="player-card-meta">
                    <span>🏀 {team?.name}</span>
                    <span>·</span>
                    <span>{age} yaş</span>
                    <span>·</span>
                    <span>{player.heightCm} cm / {player.weightKg} kg</span>
                    <span>·</span>
                    <span>{player.dominantHand === 'right' ? '🤜 Sağ' : '🤛 Sol'}</span>
                  </div>
                </div>

                {/* Stats */}
                {stats ? (
                  <div className="player-card-stats">
                    {[
                      { val: stats.ppg, lbl: 'PPG' },
                      { val: stats.rpg, lbl: 'RPG' },
                      { val: stats.apg, lbl: 'APG' },
                      { val: stats.fgPct + '%', lbl: 'FG%' },
                    ].map(s => (
                      <div key={s.lbl} className="player-card-stat">
                        <span className="player-card-stat-val">{s.val}</span>
                        <span className="player-card-stat-lbl">{s.lbl}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--c-text-3)', fontSize: '0.75rem' }}>Maç verisi yok</div>
                )}

                <ChevronRight size={16} style={{ color: 'var(--c-text-3)', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

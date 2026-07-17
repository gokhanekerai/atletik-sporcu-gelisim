import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trophy, MapPin, Calendar } from 'lucide-react';
import { localDb } from '../lib/supabase';

const initials = name => name.split(' ').map(n => n[0]).join('').slice(0, 2);

export default function Matches() {
  const { t } = useTranslation();
  const [teamFilter, setTeamFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState(null);

  const db = localDb.get();
  const matches = db.matches || [];
  const teams = db.teams || [];
  const matchStats = db.matchStats || [];
  const players = db.profiles || [];

  const filtered = matches.filter(m => {
    const matchTeam = teamFilter === 'all' || m.teamId === parseInt(teamFilter);
    const matchResult = resultFilter === 'all' ||
      (resultFilter === 'upcoming' && !m.result) ||
      m.result === resultFilter;
    return matchTeam && matchResult;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const wins = matches.filter(m => m.result === 'W').length;
  const losses = matches.filter(m => m.result === 'L').length;
  const draws = matches.filter(m => m.result === 'D').length;
  const upcoming = matches.filter(m => !m.result).length;

  const getMatchStats = (matchId) => {
    return matchStats.filter(s => s.matchId === matchId).map(s => ({
      ...s,
      player: players.find(p => p.id === s.playerId),
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('nav.matches')}</h1>
          <p>{matches.length} toplam maç</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary"><Plus size={16} /> Maç Ekle</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-4" style={{ marginBottom: 'var(--space-8)' }}>
        {[
          { label: 'Galibiyet', val: wins, color: 'var(--c-green)', bg: 'rgba(52,211,153,0.15)', icon: '✅' },
          { label: 'Mağlubiyet', val: losses, color: 'var(--c-red)', bg: 'rgba(248,113,113,0.15)', icon: '❌' },
          { label: 'Beraberlik', val: draws, color: 'var(--c-yellow)', bg: 'rgba(245,158,11,0.15)', icon: '🤝' },
          { label: 'Yaklaşan', val: upcoming, color: 'var(--c-primary)', bg: 'var(--c-primary-dim)', icon: '📅' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: s.bg, fontSize: '1.2rem' }}>{s.icon}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="filter-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="all">Tüm Takımlar</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="filter-select" value={resultFilter} onChange={e => setResultFilter(e.target.value)}>
          <option value="all">Tüm Sonuçlar</option>
          <option value="W">Galibiyet</option>
          <option value="L">Mağlubiyet</option>
          <option value="D">Beraberlik</option>
          <option value="upcoming">Yaklaşan</option>
        </select>
      </div>

      {/* Match List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.map(match => {
          const team = teams.find(t => t.id === match.teamId);
          const mStats = getMatchStats(match.id);
          const isUpcoming = !match.result;

          return (
            <div
              key={match.id}
              className="card"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedMatch(selectedMatch?.id === match.id ? null : match)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                {/* Date */}
                <div style={{
                  textAlign: 'center', minWidth: 60,
                  background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)',
                  padding: 'var(--space-3)',
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--c-text-3)', textTransform: 'uppercase' }}>
                    {new Date(match.date).toLocaleString('tr-TR', { month: 'short' })}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', lineHeight: 1 }}>
                    {new Date(match.date).getDate()}
                  </div>
                </div>

                {/* Result badge */}
                <div className={`match-result-badge result-${match.result || 'upcoming'}`} style={{ width: 36, height: 36, fontSize: '0.8rem' }}>
                  {match.result || '⏰'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                    vs {match.opponent}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.75rem', color: 'var(--c-text-3)', flexWrap: 'wrap' }}>
                    <span>🏀 {team?.name}</span>
                    <span><MapPin size={11} style={{ display: 'inline', marginRight: 2 }} />{match.location}</span>
                    <span className={`badge badge-${match.homeAway === 'home' ? 'teal' : 'purple'}`}>
                      {match.homeAway === 'home' ? 'İç Saha' : 'Deplasman'}
                    </span>
                  </div>
                </div>

                {/* Score */}
                {match.score ? (
                  <div style={{
                    fontFamily: 'var(--font-display)', fontWeight: 900,
                    fontSize: '1.5rem', color: match.result === 'W' ? 'var(--c-green)' : match.result === 'L' ? 'var(--c-red)' : 'var(--c-yellow)',
                  }}>
                    {match.score}
                  </div>
                ) : (
                  <div className="badge badge-orange">Yaklaşan Maç</div>
                )}
              </div>

              {/* Expanded Stats */}
              {selectedMatch?.id === match.id && mStats.length > 0 && (
                <div style={{ marginTop: 'var(--space-5)', borderTop: '1px solid var(--c-border)', paddingTop: 'var(--space-5)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 'var(--space-3)', color: 'var(--c-text-2)' }}>
                    Maç İstatistikleri
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Sporcu</th>
                          <th>Dk</th>
                          <th>Say</th>
                          <th>Rib</th>
                          <th>Asi</th>
                          <th>Çal</th>
                          <th>Blk</th>
                          <th>FG%</th>
                          <th>3P%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mStats.map(s => {
                          const fg = s.fgAttempted > 0 ? Math.round((s.fgMade / s.fgAttempted) * 100) : 0;
                          const tp = s.threeAttempted > 0 ? Math.round((s.threeMade / s.threeAttempted) * 100) : 0;
                          return (
                            <tr key={s.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                  <div className="avatar avatar-sm">{initials(s.player?.fullName || '?')}</div>
                                  <span style={{ fontWeight: 600 }}>{s.player?.fullName}</span>
                                </div>
                              </td>
                              <td>{s.minutesPlayed}</td>
                              <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{s.points}</td>
                              <td>{s.rebounds}</td>
                              <td>{s.assists}</td>
                              <td>{s.steals}</td>
                              <td>{s.blocks}</td>
                              <td>{fg}%</td>
                              <td>{tp}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedMatch?.id === match.id && mStats.length === 0 && (
                <div style={{ marginTop: 'var(--space-4)', textAlign: 'center', color: 'var(--c-text-3)', fontSize: '0.85rem' }}>
                  Bu maça ait istatistik girilmemiş.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

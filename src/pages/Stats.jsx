import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import { localDb } from '../lib/supabase';
import { getPlayerStats } from '../data/mockData';

const initials = name => name.split(' ').map(n => n[0]).join('').slice(0, 2);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--c-surface-2)', border: '1px solid var(--c-border-2)',
      borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: '0.8rem'
    }}>
      <p style={{ color: 'var(--c-text)', fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function Stats() {
  const { t } = useTranslation();
  const [compareA, setCompareA] = useState('1');
  const [compareB, setCompareB] = useState('2');
  const [teamFilter, setTeamFilter] = useState('all');

  const db = localDb.get();
  const players = db.profiles || [];
  const teams = db.teams || [];

  const filteredPlayers = players.filter(p =>
    teamFilter === 'all' || p.teamId === parseInt(teamFilter)
  );

  const allStats = filteredPlayers.map(p => ({
    ...p,
    stats: getPlayerStats(p.id),
  })).filter(p => p.stats);

  const playerA = players.find(p => p.id === parseInt(compareA));
  const playerB = players.find(p => p.id === parseInt(compareB));
  const statsA = getPlayerStats(parseInt(compareA));
  const statsB = getPlayerStats(parseInt(compareB));

  // Bar chart data - PPG ranking
  const ppgData = allStats
    .sort((a, b) => parseFloat(b.stats.ppg) - parseFloat(a.stats.ppg))
    .map(p => ({
      name: p.fullName.split(' ')[0],
      sayı: parseFloat(p.stats.ppg),
      ribaund: parseFloat(p.stats.rpg),
      asist: parseFloat(p.stats.apg),
    }));

  // Radar comparison
  const radarData = statsA && statsB ? [
    { subject: 'Sayı', A: Math.min(parseFloat(statsA.ppg) * 4, 100), B: Math.min(parseFloat(statsB.ppg) * 4, 100) },
    { subject: 'Ribaund', A: Math.min(parseFloat(statsA.rpg) * 7, 100), B: Math.min(parseFloat(statsB.rpg) * 7, 100) },
    { subject: 'Asist', A: Math.min(parseFloat(statsA.apg) * 10, 100), B: Math.min(parseFloat(statsB.apg) * 10, 100) },
    { subject: 'Top Çalma', A: Math.min(parseFloat(statsA.spg) * 25, 100), B: Math.min(parseFloat(statsB.spg) * 25, 100) },
    { subject: 'Blok', A: Math.min(parseFloat(statsA.bpg) * 20, 100), B: Math.min(parseFloat(statsB.bpg) * 20, 100) },
    { subject: 'FG%', A: parseFloat(statsA.fgPct), B: parseFloat(statsB.fgPct) },
  ] : [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('nav.stats')}</h1>
          <p>Sezon 2025-26 analiz ve karşılaştırma</p>
        </div>
        <div className="page-header-actions">
          <select className="filter-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
            <option value="all">Tüm Takımlar</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <div className="card-title">Sayı Sıralaması (Maç Ortalaması)</div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={ppgData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--c-text-2)', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
            <Bar dataKey="sayı" name="Sayı" fill="#FF6B35" radius={[0, 4, 4, 0]} />
            <Bar dataKey="ribaund" name="Ribaund" fill="#4ECDC4" radius={[0, 4, 4, 0]} />
            <Bar dataKey="asist" name="Asist" fill="#A78BFA" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Comparison */}
      <div className="grid-1-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Radar */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Karşılaştırma Radarı</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <select style={{ flex: 1 }} value={compareA} onChange={e => setCompareA(e.target.value)}>
              {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
            <select style={{ flex: 1 }} value={compareB} onChange={e => setCompareB(e.target.value)}>
              {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
          </div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--c-text-3)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name={playerA?.fullName?.split(' ')[0]} dataKey="A" stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.2} strokeWidth={2} />
                <Radar name={playerB?.fullName?.split(' ')[0]} dataKey="B" stroke="#4ECDC4" fill="#4ECDC4" fillOpacity={0.2} strokeWidth={2} />
                <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state"><p>Veri yok</p></div>}
        </div>

        {/* Head to head */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Birebir Karşılaştırma</div>
          </div>
          {statsA && statsB && playerA && playerB ? (
            <div>
              {/* Player labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="avatar avatar-lg" style={{ margin: '0 auto 8px' }}>{initials(playerA.fullName)}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{playerA.fullName}</div>
                  <div className={`pos-chip pos-${playerA.position}`} style={{ margin: '4px auto 0', width: 'auto', padding: '2px 8px', fontSize: '0.7rem' }}>{playerA.position}</div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.1rem',
                  color: 'var(--c-text-3)',
                }}>VS</div>
                <div style={{ textAlign: 'center' }}>
                  <div className="avatar avatar-lg" style={{ margin: '0 auto 8px', background: 'var(--g-accent)' }}>{initials(playerB.fullName)}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{playerB.fullName}</div>
                  <div className={`pos-chip pos-${playerB.position}`} style={{ margin: '4px auto 0', width: 'auto', padding: '2px 8px', fontSize: '0.7rem' }}>{playerB.position}</div>
                </div>
              </div>

              {/* Stat rows */}
              {[
                { label: 'Sayı (PPG)', a: statsA.ppg, b: statsB.ppg },
                { label: 'Ribaund (RPG)', a: statsA.rpg, b: statsB.rpg },
                { label: 'Asist (APG)', a: statsA.apg, b: statsB.apg },
                { label: 'Top Çalma', a: statsA.spg, b: statsB.spg },
                { label: 'Blok', a: statsA.bpg, b: statsB.bpg },
                { label: 'FG%', a: statsA.fgPct, b: statsB.fgPct },
                { label: '3P%', a: statsA.threePct, b: statsB.threePct },
              ].map(row => {
                const aWins = parseFloat(row.a) >= parseFloat(row.b);
                return (
                  <div key={row.label} style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        fontWeight: 800, fontSize: '0.9rem',
                        color: aWins ? 'var(--c-primary)' : 'var(--c-text-3)',
                      }}>{row.a}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textAlign: 'center' }}>{row.label}</span>
                      <span style={{
                        fontWeight: 800, fontSize: '0.9rem',
                        color: !aWins ? 'var(--c-accent)' : 'var(--c-text-3)',
                      }}>{row.b}</span>
                    </div>
                    <div style={{ position: 'relative', height: 6, background: 'var(--c-surface-3)', borderRadius: 99 }}>
                      <div style={{
                        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                        height: '100%', width: '100%', display: 'flex',
                      }}>
                        <div style={{
                          background: '#FF6B35',
                          width: `${Math.min((parseFloat(row.a) / (parseFloat(row.a) + parseFloat(row.b) || 1)) * 100, 100)}%`,
                          borderRadius: '99px 0 0 99px',
                        }} />
                        <div style={{
                          background: '#4ECDC4',
                          flex: 1,
                          borderRadius: '0 99px 99px 0',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><p>Karşılaştırmak için sporcu seçin</p></div>
          )}
        </div>
      </div>

      {/* Full Stats Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Tam İstatistik Tablosu</div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Sporcu</th>
                <th>Mevki</th>
                <th>Maç</th>
                <th>PPG</th>
                <th>RPG</th>
                <th>APG</th>
                <th>SPG</th>
                <th>BPG</th>
                <th>FG%</th>
                <th>3P%</th>
                <th>FT%</th>
                <th>MPG</th>
              </tr>
            </thead>
            <tbody>
              {allStats.sort((a, b) => parseFloat(b.stats.ppg) - parseFloat(a.stats.ppg)).map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div className="avatar avatar-sm">{initials(p.fullName)}</div>
                      <span style={{ fontWeight: 600 }}>{p.fullName}</span>
                    </div>
                  </td>
                  <td><div className={`pos-chip pos-${p.position}`}>{p.position}</div></td>
                  <td>{p.stats.gamesPlayed}</td>
                  <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{p.stats.ppg}</td>
                  <td>{p.stats.rpg}</td>
                  <td>{p.stats.apg}</td>
                  <td>{p.stats.spg}</td>
                  <td>{p.stats.bpg}</td>
                  <td>{p.stats.fgPct}%</td>
                  <td>{p.stats.threePct}%</td>
                  <td>{p.stats.ftPct}%</td>
                  <td>{p.stats.mpg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

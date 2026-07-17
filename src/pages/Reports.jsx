import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, User, Users } from 'lucide-react';
import { localDb } from '../lib/supabase';
import { getPlayerStats } from '../data/mockData';

const initials = name => name.split(' ').map(n => n[0]).join('').slice(0, 2);

export default function Reports() {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState('individual');
  const [selectedPlayerId, setSelectedPlayerId] = useState('1');
  const [selectedTeamId, setSelectedTeamId] = useState('1');

  const db = localDb.get();
  const players = db.profiles || [];
  const teams = db.teams || [];
  const matches = db.matches || [];
  const physicalMeasurements = db.physicalMeasurements || [];
  const goals = db.goals || [];

  const selectedPlayer = players.find(p => p.id?.toString() === selectedPlayerId?.toString());
  const selectedTeam = teams.find(t => t.id?.toString() === selectedTeamId?.toString());
  const playerStats = selectedPlayer ? getPlayerStats(parseInt(selectedPlayer.id)) : null;
  const playerPhysical = physicalMeasurements.filter(m => m.playerId?.toString() === selectedPlayerId?.toString());
  const playerGoals = goals.filter(g => g.playerId?.toString() === selectedPlayerId?.toString());
  const teamPlayers = players.filter(p => p.teamId?.toString() === selectedTeamId?.toString());
  const teamMatches = matches.filter(m => m.teamId?.toString() === selectedTeamId?.toString() && m.result);
  const teamWins = teamMatches.filter(m => m.result === 'W').length;

  const handleExport = () => {
    alert('PDF export özelliği Supabase entegrasyonu sonrası aktif olacak. Şu an demo modunda!');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('nav.reports')}</h1>
          <p>Sporcu ve takım performans raporları</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleExport}>
            <Download size={16} /> {t('reports.exportPdf')}
          </button>
        </div>
      </div>

      {/* Type Selector */}
      <div className="tabs" style={{ maxWidth: 400 }}>
        <button className={`tab-btn${reportType === 'individual' ? ' active' : ''}`} onClick={() => setReportType('individual')}>
          <User size={15} /> {t('reports.individual')}
        </button>
        <button className={`tab-btn${reportType === 'team' ? ' active' : ''}`} onClick={() => setReportType('team')}>
          <Users size={15} /> {t('reports.team')}
        </button>
      </div>

      {/* Individual Report */}
      {reportType === 'individual' && (
        <div>
          <div className="filters-bar" style={{ marginBottom: 'var(--space-6)' }}>
            <select style={{ maxWidth: 280 }} value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)}>
              {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
          </div>

          {selectedPlayer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }} id="report-content">
              {/* Report Header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,107,53,0.1) 0%, rgba(78,205,196,0.08) 100%)',
                border: '1px solid rgba(255,107,53,0.2)',
                borderRadius: 'var(--r-xl)',
                padding: 'var(--space-8)',
              }}>
                <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="avatar avatar-xl" style={{ boxShadow: 'var(--shadow-orange)' }}>
                    {initials(selectedPlayer.fullName)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--c-primary)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
                      BİREYSEL PERFORMANS RAPORU • SEZON 2025-26
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, marginBottom: 4 }}>
                      {selectedPlayer.fullName}
                    </h2>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--c-text-2)' }}>
                      <span>#{selectedPlayer.jerseyNumber}</span>
                      <span>{selectedPlayer.position}</span>
                      <span>{teams.find(t => t.id === selectedPlayer.teamId)?.name}</span>
                      <span>{selectedPlayer.heightCm}cm / {selectedPlayer.weightKg}kg</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              {playerStats ? (
                <>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                      📊 Sezon İstatistikleri
                    </h3>
                    <div className="grid-4">
                      {[
                        { label: 'Sayı (PPG)', val: playerStats.ppg, color: 'var(--c-primary)' },
                        { label: 'Ribaund (RPG)', val: playerStats.rpg, color: 'var(--c-accent)' },
                        { label: 'Asist (APG)', val: playerStats.apg, color: 'var(--c-purple)' },
                        { label: 'Şut % (FG%)', val: `${playerStats.fgPct}%`, color: 'var(--c-yellow)' },
                        { label: '3 Sayı %', val: `${playerStats.threePct}%`, color: 'var(--c-green)' },
                        { label: 'Serbest Atış %', val: `${playerStats.ftPct}%`, color: 'var(--c-red)' },
                        { label: 'Oynanan Maç', val: playerStats.gamesPlayed, color: 'var(--c-text)' },
                        { label: 'Dak/Maç', val: playerStats.mpg, color: 'var(--c-text-2)' },
                      ].map(s => (
                        <div key={s.label} className="stat-card">
                          <div className="stat-card-value" style={{ color: s.color, fontSize: '1.5rem' }}>{s.val}</div>
                          <div className="stat-card-label">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state"><p>Maç istatistiği bulunamadı</p></div>
              )}

              {/* Physical */}
              {playerPhysical.length > 0 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                    💪 Fiziksel Ölçümler (Son)
                  </h3>
                  <div className="grid-3">
                    {[
                      { label: 'Dikey Sıçrama', val: `${playerPhysical.at(-1).verticalJumpCm} cm` },
                      { label: '30m Sprint', val: `${playerPhysical.at(-1).sprint30mSec}s` },
                      { label: 'VO₂Max', val: playerPhysical.at(-1).vo2max },
                      { label: 'Yağ Oranı', val: `${playerPhysical.at(-1).bodyFatPct}%` },
                      { label: 'Çeviklik', val: `${playerPhysical.at(-1).agilityTestSec}s` },
                    ].map(s => (
                      <div key={s.label} className="stat-card">
                        <div className="stat-card-value" style={{ fontSize: '1.3rem' }}>{s.val}</div>
                        <div className="stat-card-label">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              {playerGoals.length > 0 && (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                    🎯 Sezon Hedefleri
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {playerGoals.map(g => {
                      const pct = Math.min(Math.round((g.currentValue / g.targetValue) * 100), 100);
                      return (
                        <div key={g.id} style={{
                          background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)',
                          padding: 'var(--space-4)', border: '1px solid var(--c-border)',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>{g.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>{g.description}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: g.status === 'achieved' ? 'var(--c-green)' : 'var(--c-primary)' }}>
                                {pct}%
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>{g.currentValue}/{g.targetValue} {g.unit}</div>
                            </div>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{
                              width: `${pct}%`,
                              background: g.status === 'achieved' ? 'var(--c-green)' : 'var(--g-primary)',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Team Report */}
      {reportType === 'team' && (
        <div>
          <div className="filters-bar" style={{ marginBottom: 'var(--space-6)' }}>
            <select style={{ maxWidth: 280 }} value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {selectedTeam && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* Team Header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(78,205,196,0.1) 0%, rgba(167,139,250,0.08) 100%)',
                border: '1px solid rgba(78,205,196,0.2)',
                borderRadius: 'var(--r-xl)',
                padding: 'var(--space-8)',
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--c-accent)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
                  TAKIM PERFORMANS RAPORU • SEZON 2025-26
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, marginBottom: 4 }}>
                  {selectedTeam.name}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)' }}>
                  {teamPlayers.length} sporcu · {selectedTeam.category}
                </div>
              </div>

              {/* Team Stats */}
              <div className="grid-4">
                {[
                  { label: 'Toplam Maç', val: teamMatches.length, color: 'var(--c-text)' },
                  { label: 'Galibiyet', val: teamWins, color: 'var(--c-green)' },
                  { label: 'Mağlubiyet', val: teamMatches.filter(m => m.result === 'L').length, color: 'var(--c-red)' },
                  { label: 'Galibiyet %', val: teamMatches.length > 0 ? `${Math.round((teamWins / teamMatches.length) * 100)}%` : '—', color: 'var(--c-primary)' },
                ].map(s => (
                  <div key={s.label} className="stat-card">
                    <div className="stat-card-value" style={{ color: s.color }}>{s.val}</div>
                    <div className="stat-card-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Player Stats Table */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Oyuncu İstatistikleri</div>
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
                        <th>FG%</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamPlayers.map(p => {
                        const s = getPlayerStats(p.id);
                        return (
                          <tr key={p.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="avatar avatar-sm">{initials(p.fullName)}</div>
                                <span style={{ fontWeight: 600 }}>{p.fullName}</span>
                              </div>
                            </td>
                            <td><div className={`pos-chip pos-${p.position}`}>{p.position}</div></td>
                            <td>{s?.gamesPlayed || '—'}</td>
                            <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{s?.ppg || '—'}</td>
                            <td>{s?.rpg || '—'}</td>
                            <td>{s?.apg || '—'}</td>
                            <td>{s ? `${s.fgPct}%` : '—'}</td>
                            <td>
                              <span className={`badge badge-${p.status === 'active' ? 'green' : 'red'}`}>
                                {p.status === 'active' ? 'Aktif' : 'Sakatlanmış'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { localDb } from '../lib/supabase';

const sessionTypes = ['Teknik Antrenman', 'Kondisyon', 'Taktik', 'Atış Antrenmanı', 'Takım Antrenmanı'];

const daysOfWeek = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function CalendarView({ sessions, onSelect, teams }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (firstDay + 6) % 7; // Monday-based

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const sessionsByDay = {};
  sessions.forEach(s => {
    const d = new Date(s.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!sessionsByDay[day]) sessionsByDay[day] = [];
      sessionsByDay[day].push(s);
    }
  });

  return (
    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
      <div className="card-header">
        <div className="card-title">
          {today.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {daysOfWeek.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '0.7rem', fontWeight: 700,
            color: 'var(--c-text-3)', padding: '6px 0', textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          const sessions = day ? sessionsByDay[day] || [] : [];
          const isToday = day === today.getDate();
          return (
            <div
              key={i}
              style={{
                minHeight: 64, padding: 6,
                background: day ? 'var(--c-surface-2)' : 'transparent',
                borderRadius: 'var(--r-md)',
                border: isToday ? '1px solid var(--c-primary)' : '1px solid transparent',
                cursor: sessions.length > 0 ? 'pointer' : 'default',
              }}
              onClick={() => sessions.length > 0 && onSelect(sessions[0])}
            >
              {day && (
                <>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: isToday ? 800 : 500,
                    color: isToday ? 'var(--c-primary)' : 'var(--c-text-2)',
                    marginBottom: 4,
                  }}>{day}</div>
                  {sessions.map(s => {
                    const team = teams.find(t => t.id === s.teamId);
                    return (
                      <div key={s.id} style={{
                        fontSize: '0.6rem', background: 'var(--c-primary-dim)',
                        color: 'var(--c-primary)', borderRadius: 4,
                        padding: '2px 4px', marginBottom: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {s.type}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Training() {
  const { t } = useTranslation();
  const [teamFilter, setTeamFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);

  const db = localDb.get();
  const trainingSessions = db.trainingSessions || [];
  const teams = db.teams || [];
  const attendance = db.attendance || [];
  const players = db.profiles || [];

  const filtered = trainingSessions.filter(s => {
    const matchTeam = teamFilter === 'all' || s.teamId === parseInt(teamFilter);
    const matchType = typeFilter === 'all' || s.type === typeFilter;
    return matchTeam && matchType;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalSessions = trainingSessions.length;
  const totalMinutes = trainingSessions.reduce((a, s) => a + s.durationMinutes, 0);
  const avgDuration = Math.round(totalMinutes / totalSessions);

  const getSessionAttendance = (sessionId) => {
    const sessionAtt = attendance.filter(a => a.sessionId === sessionId);
    const present = sessionAtt.filter(a => a.present).length;
    return { present, total: sessionAtt.length };
  };

  const getSessionPlayers = (sessionId) => {
    return attendance
      .filter(a => a.sessionId === sessionId)
      .map(a => ({
        ...a,
        player: players.find(p => p.id === a.playerId),
      }));
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('nav.training')}</h1>
          <p>{totalSessions} antrenman oturumu</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary"><Plus size={16} /> Oturum Ekle</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-8)' }}>
        {[
          { icon: <Clock size={20} />, label: 'Toplam Süre', val: `${Math.round(totalMinutes / 60)}s ${totalMinutes % 60}dk`, color: 'var(--c-primary)', bg: 'var(--c-primary-dim)' },
          { icon: <Users size={20} />, label: 'Ortalama Katılım', val: '82%', color: 'var(--c-green)', bg: 'rgba(52,211,153,0.15)' },
          { icon: <CheckCircle size={20} />, label: 'Ort. Süre', val: `${avgDuration} dk`, color: 'var(--c-accent)', bg: 'var(--c-accent-dim)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-card-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <CalendarView sessions={trainingSessions} onSelect={setSelectedSession} teams={teams} />

      {/* Filters */}
      <div className="filters-bar">
        <select className="filter-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="all">Tüm Takımlar</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="filter-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Tüm Türler</option>
          {sessionTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Sessions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.map(session => {
          const team = teams.find(t => t.id === session.teamId);
          const att = getSessionAttendance(session.id);
          const attRate = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
          const isSelected = selectedSession?.id === session.id;

          return (
            <div
              key={session.id}
              className="card"
              style={{ cursor: 'pointer', borderColor: isSelected ? 'var(--c-primary)' : undefined }}
              onClick={() => setSelectedSession(isSelected ? null : session)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                {/* Date Box */}
                <div style={{
                  textAlign: 'center', minWidth: 56,
                  background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)', padding: 'var(--space-3)',
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--c-text-3)', textTransform: 'uppercase' }}>
                    {new Date(session.date).toLocaleString('tr-TR', { month: 'short' })}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', lineHeight: 1 }}>
                    {new Date(session.date).getDate()}
                  </div>
                </div>

                {/* Type Badge */}
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--r-md)',
                  background: 'var(--c-primary-dim)', color: 'var(--c-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', flexShrink: 0,
                }}>
                  {session.type.includes('Kondisyon') ? '💪' : session.type.includes('Taktik') ? '🧠' : session.type.includes('Atış') ? '🎯' : '🏀'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{session.type}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>🏀 {team?.name}</span>
                    <span>⏱ {session.durationMinutes} dk</span>
                    {session.notes && <span>📝 {session.notes}</span>}
                  </div>
                </div>

                {/* Attendance */}
                {att.total > 0 && (
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800,
                      color: attRate >= 80 ? 'var(--c-green)' : attRate >= 60 ? 'var(--c-yellow)' : 'var(--c-red)',
                    }}>{attRate}%</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--c-text-3)' }}>{att.present}/{att.total} katılım</div>
                  </div>
                )}
              </div>

              {/* Expanded Attendance */}
              {isSelected && (
                <div style={{ marginTop: 'var(--space-5)', borderTop: '1px solid var(--c-border)', paddingTop: 'var(--space-5)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 'var(--space-3)', color: 'var(--c-text-2)' }}>
                    Devam Listesi
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                    {getSessionPlayers(session.id).map(a => (
                      <div key={a.id} style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                        background: 'var(--c-surface-2)', borderRadius: 'var(--r-md)',
                        padding: 'var(--space-2) var(--space-3)',
                        border: `1px solid ${a.present ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                      }}>
                        {a.present ? <CheckCircle size={14} color="var(--c-green)" /> : <XCircle size={14} color="var(--c-red)" />}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.player?.fullName}</span>
                        {a.reasonAbsent && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>({a.reasonAbsent})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

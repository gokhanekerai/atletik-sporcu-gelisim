import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Target, Activity, Ruler, Calendar, Key, Shield, User, Camera } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, LineChart, Line, Legend
} from 'recharts';
import { localDb } from '../lib/supabase';


const initials = name => name.split(' ').map(n => n[0]).join('').slice(0, 2);

const tabs = [
  { key: 'stats', label: 'İstatistikler', icon: Activity },
  { key: 'physical', label: 'Fiziksel Gelişim', icon: Ruler },
  { key: 'goals', label: 'Hedefler', icon: Target },
  { key: 'attendance', label: 'Devam', icon: Calendar },
];

export default function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('stats');
  
  // State for password and image editing
  const [passwordState, setPasswordState] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const userRole = localStorage.getItem('user_role') || 'admin';

  const db = localDb.get();
  const playersList = db.profiles || [];
  const teamsList = db.teams || [];
  const matchesList = db.matches || [];
  const matchStatsList = db.matchStats || [];
  const physicalMeasurementsList = db.physicalMeasurements || [];
  const goalsList = db.goals || [];
  const attendanceList = db.attendance || [];
  const trainingSessionsList = db.trainingSessions || [];

  const player = playersList.find(p => p.id === id || p.id === parseInt(id)?.toString());
  
  if (!player) return (
    <div className="empty-state">
      <div className="empty-state-icon">🏀</div>
      <p>Sporcu bulunamadı</p>
      {userRole === 'admin' && (
        <button className="btn btn-primary" onClick={() => navigate('/players')}>Geri Dön</button>
      )}
    </div>
  );

  const team = teamsList.find(t => t.id === player.teamId);

  // Dynamic player stats calculation
  const getPlayerStatsDynamic = (pId) => {
    const stats = matchStatsList.filter(s => s.playerId === parseInt(pId) || s.playerId === pId);
    if (!stats.length) return null;
    const n = stats.length;
    return {
      gamesPlayed: n,
      ppg: (stats.reduce((a, s) => a + s.points, 0) / n).toFixed(1),
      rpg: (stats.reduce((a, s) => a + s.rebounds, 0) / n).toFixed(1),
      apg: (stats.reduce((a, s) => a + s.assists, 0) / n).toFixed(1),
      spg: (stats.reduce((a, s) => a + s.steals, 0) / n).toFixed(1),
      bpg: (stats.reduce((a, s) => a + s.blocks, 0) / n).toFixed(1),
      fgPct: stats.reduce((a, s) => a + s.fgAttempted, 0) > 0
        ? ((stats.reduce((a, s) => a + s.fgMade, 0) / stats.reduce((a, s) => a + s.fgAttempted, 0)) * 100).toFixed(1)
        : '0.0',
      threePct: stats.reduce((a, s) => a + s.threeAttempted, 0) > 0
        ? ((stats.reduce((a, s) => a + s.threeMade, 0) / stats.reduce((a, s) => a + s.threeAttempted, 0)) * 100).toFixed(1)
        : '0.0',
      mpg: (stats.reduce((a, s) => a + s.minutesPlayed, 0) / n).toFixed(1),
    };
  };

  const stats = getPlayerStatsDynamic(player.id);
  const playerMatches = matchStatsList.filter(s => s.playerId?.toString() === player.id?.toString());
  
  const physicalData = (db.physicalMeasurements || [])
    .concat(db.antropometri || [])
    .filter(m => m.playerId?.toString() === player.id?.toString())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
    
  const playerGoals = (db.goals || [])
    .filter(g => g.playerId?.toString() === player.id?.toString());
    
  const playerAttendance = attendanceList.filter(a => a.playerId?.toString() === player.id?.toString());

  const getAge = (birthDate) => {
    if (!birthDate) return '—';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() - birth.getMonth() < 0 ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Radar data
  const radarData = stats ? [
    { subject: 'Sayı', val: Math.min(parseFloat(stats.ppg) * 4, 100) },
    { subject: 'Ribaund', val: Math.min(parseFloat(stats.rpg) * 8, 100) },
    { subject: 'Asist', val: Math.min(parseFloat(stats.apg) * 10, 100) },
    { subject: 'Savunma', val: Math.min((parseFloat(stats.spg) + parseFloat(stats.bpg)) * 15, 100) },
    { subject: 'Verimlilik', val: Math.min(parseFloat(stats.fgPct) * 1.4, 100) },
    { subject: 'Dakika', val: Math.min(parseFloat(stats.mpg) * 2.5, 100) },
  ] : [];

  // Match-by-match
  const matchTrend = playerMatches.map(s => {
    const m = matchesList.find(m => m.id === s.matchId);
    return {
      game: m?.opponent?.split(' ')[0] || `Maç ${s.matchId}`,
      sayı: s.points,
      ribaund: s.rebounds,
      asist: s.assists,
    };
  });

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dbCurrent = localDb.get();
        const profiles = dbCurrent.profiles || [];
        const index = profiles.findIndex(p => p.id === player.id);
        if (index !== -1) {
          profiles[index].avatarUrl = reader.result;
          localDb.set(dbCurrent);
          setSaveStatus('Fotoğraf başarıyla yüklendi!');
          setTimeout(() => setSaveStatus(''), 2000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePassword = () => {
    if (!passwordState) return;
    const dbCurrent = localDb.get();
    const profiles = dbCurrent.profiles || [];
    const index = profiles.findIndex(p => p.id === player.id);
    if (index !== -1) {
      profiles[index].password = passwordState;
      localDb.set(dbCurrent);
      setSaveStatus('Şifre başarıyla güncellendi!');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  const attendanceRate = playerAttendance.length > 0
    ? Math.round((playerAttendance.filter(a => a.present).length / playerAttendance.length) * 100)
    : 0;

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

  return (
    <div>
      {/* Back & SignOut feedback */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        {userRole === 'admin' ? (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/players')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> Sporculara Dön
          </button>
        ) : <div />}
        
        {saveStatus && (
          <div style={{
            background: 'rgba(39,174,96,0.15)',
            border: '1px solid rgba(39,174,96,0.3)',
            color: 'var(--c-green)',
            borderRadius: 'var(--r-md)',
            padding: '6px 12px',
            fontSize: '0.75rem'
          }}>{saveStatus}</div>
        )}
      </div>

      {/* Profile Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface-2) 100%)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--space-8)',
        marginBottom: 'var(--space-6)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -10,
          fontFamily: 'var(--font-display)', fontWeight: 900,
          fontSize: 150, color: 'rgba(255,107,53,0.05)', lineHeight: 1,
          userSelect: 'none',
        }}>#{player.jerseyNumber}</div>

        <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-start', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
          {/* Avatar Container with local file upload triggers */}
          <div style={{ position: 'relative' }}>
            <div className="avatar avatar-2xl" style={{ 
              boxShadow: 'var(--shadow-orange)',
              overflow: 'hidden',
              background: player.avatarUrl ? `url(${player.avatarUrl}) center/cover no-repeat` : 'var(--c-surface-3)'
            }}>
              {!player.avatarUrl && initials(player.fullName)}
            </div>
            
            {userRole === 'admin' && (
              <label style={{
                position: 'absolute', bottom: -5, right: -5,
                background: 'var(--c-primary)', color: 'white',
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: '2px solid var(--c-surface)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                <Camera size={14} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 900 }}>
                {player.fullName}
              </h1>
              <div className={`pos-chip pos-${player.position}`} style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}>
                {player.position}
              </div>
              <div className={`badge badge-${player.status === 'active' ? 'green' : 'red'}`}>
                {player.status === 'active' ? '● Aktif' : '⚠ Sakatlanmış'}
              </div>
            </div>
            <p style={{ color: 'var(--c-text-2)', marginBottom: 'var(--space-5)', fontSize: '0.9rem' }}>
              {player.bio}
            </p>


            {/* Bio Grid */}
            <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
              {[
                { label: 'Takım', val: team?.name },
                { label: 'Yaş', val: `${getAge(player.birthDate)} yaş` },
                { label: 'Boy', val: `${player.heightCm} cm` },
                { label: 'Kilo', val: `${player.weightKg} kg` },
                { label: 'El', val: player.dominantHand === 'right' ? 'Sağ' : 'Sol' },
                { label: 'Forma', val: `#${player.jerseyNumber}` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--c-text)' }}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          {stats && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)',
              background: 'var(--c-surface-3)', borderRadius: 'var(--r-lg)',
              padding: 'var(--space-4)', minWidth: 220,
            }}>
              {[
                { val: stats.ppg, lbl: 'PPG', color: 'var(--c-primary)' },
                { val: stats.rpg, lbl: 'RPG', color: 'var(--c-accent)' },
                { val: stats.apg, lbl: 'APG', color: 'var(--c-purple)' },
                { val: stats.fgPct + '%', lbl: 'FG%', color: 'var(--c-yellow)' },
                { val: stats.threePct + '%', lbl: '3P%', color: 'var(--c-green)' },
                { val: stats.gamesPlayed, lbl: 'Maç', color: 'var(--c-text-2)' },
              ].map(s => (
                <div key={s.lbl} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--c-text-3)' }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          )}
          {/* Admin Credentials Panel */}
          {userRole === 'admin' && (
            <div style={{
              background: 'var(--c-surface-3)', borderRadius: 'var(--r-lg)',
              padding: 'var(--space-4)', minWidth: 220,
              display: 'flex', flexDirection: 'column', gap: 10,
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Key size={12} /> Öğrenci Giriş Bilgileri
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>
                E-posta: <strong style={{ color: 'var(--c-text-2)' }}>{player.email}</strong>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.65rem' }}>Öğrenci Giriş Şifresi</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input 
                    type="text" 
                    placeholder={player.password || 'Şifre girin'} 
                    value={passwordState}
                    onChange={e => setPasswordState(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--c-surface-2)' }}
                  />
                  <button 
                    onClick={handleUpdatePassword}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                  >
                    Güncelle
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content: Stats */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="grid-2">
            {/* Radar */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Yetenek Haritası</div>
              </div>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={player.fullName} dataKey="val"
                      stroke="#FF6B35" fill="#FF6B35" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <div className="empty-state"><p>Veri yok</p></div>}
            </div>

            {/* Stat Details */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Detaylı İstatistikler</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>{stats?.gamesPlayed} maç ortalaması</div>
              </div>
              {stats ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {[
                    { label: 'Sayı', val: stats.ppg, max: 35, color: 'var(--c-primary)' },
                    { label: 'Ribaund', val: stats.rpg, max: 20, color: 'var(--c-accent)' },
                    { label: 'Asist', val: stats.apg, max: 15, color: 'var(--c-purple)' },
                    { label: 'Top Çalma', val: stats.spg, max: 5, color: 'var(--c-yellow)' },
                    { label: 'Blok', val: stats.bpg, max: 6, color: 'var(--c-green)' },
                    { label: 'Dakika', val: stats.mpg, max: 40, color: 'var(--c-text-2)' },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--c-text-2)' }}>{s.label}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: s.color }}>{s.val}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${Math.min((parseFloat(s.val) / s.max) * 100, 100)}%`,
                          background: s.color,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state"><p>Maç istatistiği bulunamadı</p></div>}
            </div>
          </div>

          {/* Match Trend */}
          {matchTrend.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Maç Bazlı Performans</div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={matchTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="game" tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }} />
                  <Line type="monotone" dataKey="sayı" stroke="#FF6B35" strokeWidth={2} dot={{ fill: '#FF6B35', r: 4 }} />
                  <Line type="monotone" dataKey="ribaund" stroke="#4ECDC4" strokeWidth={2} dot={{ fill: '#4ECDC4', r: 4 }} />
                  <Line type="monotone" dataKey="asist" stroke="#A78BFA" strokeWidth={2} dot={{ fill: '#A78BFA', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Physical */}
      {activeTab === 'physical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {physicalData.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📏</div><p>Fiziksel ölçüm verisi bulunamadı</p></div>
          ) : (
            <>
              {/* Latest measurements */}
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 'var(--space-4)', fontSize: '1rem', fontWeight: 700 }}>
                  Son Ölçümler ({physicalData[physicalData.length - 1]?.date})
                </h3>
                <div className="grid-4">
                  {[
                    { label: 'Boy', val: `${physicalData.at(-1)?.heightCm} cm`, color: 'var(--c-primary)' },
                    { label: 'Kilo', val: `${physicalData.at(-1)?.weightKg} kg`, color: 'var(--c-accent)' },
                    { label: 'Yağ Oranı', val: `${physicalData.at(-1)?.bodyFatPct}%`, color: 'var(--c-yellow)' },
                    { label: 'Dikey Sıçrama', val: `${physicalData.at(-1)?.verticalJumpCm} cm`, color: 'var(--c-purple)' },
                    { label: '30m Sprint', val: `${physicalData.at(-1)?.sprint30mSec}s`, color: 'var(--c-green)' },
                    { label: 'Çeviklik', val: `${physicalData.at(-1)?.agilityTestSec}s`, color: 'var(--c-red)' },
                    { label: 'VO₂Max', val: physicalData.at(-1)?.vo2max, color: 'var(--c-text)' },
                  ].map(item => (
                    <div key={item.label} className="stat-card">
                      <div className="stat-card-value" style={{ fontSize: '1.5rem', color: item.color }}>{item.val}</div>
                      <div className="stat-card-label">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weight Chart */}
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Kilo & Dikey Sıçrama Gelişimi</div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={physicalData}>
                    <defs>
                      <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="jGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--c-text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                    <Area type="monotone" dataKey="weightKg" name="Kilo (kg)" stroke="#FF6B35" fill="url(#wGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="verticalJumpCm" name="Sıçrama (cm)" stroke="#4ECDC4" fill="url(#jGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Content: Goals */}
      {activeTab === 'goals' && (
        <div>
          {playerGoals.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🎯</div><p>Hedef bulunamadı</p></div>
          ) : (
            <div className="grid-2">
              {playerGoals.map(goal => {
                const pct = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
                const achieved = goal.status === 'achieved';
                return (
                  <div key={goal.id} className="goal-card">
                    <div className="goal-card-header">
                      <div>
                        <div className="goal-card-title">{goal.title}</div>
                        <div className="goal-card-desc">{goal.description}</div>
                      </div>
                      <div className={`badge badge-${achieved ? 'green' : goal.status === 'missed' ? 'red' : 'orange'}`}>
                        {achieved ? '✅ Tamamlandı' : goal.status === 'missed' ? '❌ Kaçırıldı' : '🎯 Devam'}
                      </div>
                    </div>
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--c-text-3)' }}>İlerleme</span>
                        <span style={{ fontWeight: 700, color: achieved ? 'var(--c-green)' : 'var(--c-primary)' }}>{pct}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${pct}%`,
                          background: achieved ? 'var(--c-green)' : 'var(--g-primary)',
                        }} />
                      </div>
                    </div>
                    <div className="goal-numbers">
                      <span>Mevcut: <strong style={{ color: 'var(--c-primary)' }}>{goal.currentValue} {goal.unit}</strong></span>
                      <span>Hedef: <strong>{goal.targetValue} {goal.unit}</strong></span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--c-text-3)', marginTop: 6 }}>
                      📅 Bitiş: {goal.deadline}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Attendance */}
      {activeTab === 'attendance' && (
        <div>
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 900,
                  color: attendanceRate >= 80 ? 'var(--c-green)' : attendanceRate >= 60 ? 'var(--c-yellow)' : 'var(--c-red)',
                }}>{attendanceRate}%</div>
                <div style={{ color: 'var(--c-text-2)', fontSize: '0.85rem' }}>Devam Oranı</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="progress-bar" style={{ height: 12 }}>
                  <div className="progress-fill" style={{
                    width: `${attendanceRate}%`,
                    background: attendanceRate >= 80 ? 'var(--c-green)' : 'var(--c-yellow)',
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-3)', fontSize: '0.8rem', color: 'var(--c-text-2)' }}>
                  <span>✅ Katıldı: {playerAttendance.filter(a => a.present).length}</span>
                  <span>❌ Katılmadı: {playerAttendance.filter(a => !a.present).length}</span>
                  <span>📋 Toplam: {playerAttendance.length} oturum</span>
                </div>
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th>Süre</th>
                  <th>Durum</th>
                  <th>Sebep</th>
                </tr>
              </thead>
              <tbody>
                {playerAttendance.map(a => {
                  const session = trainingSessions.find(s => s.id === a.sessionId);
                  return (
                    <tr key={a.id}>
                      <td>{session?.date}</td>
                      <td>{session?.type}</td>
                      <td>{session?.durationMinutes} dk</td>
                      <td>
                        <span className={`badge badge-${a.present ? 'green' : 'red'}`}>
                          {a.present ? '✅ Katıldı' : '❌ Katılmadı'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--c-text-3)', fontSize: '0.8rem' }}>
                        {a.reasonAbsent || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

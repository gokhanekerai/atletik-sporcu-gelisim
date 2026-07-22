import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, Target, Shield, Key, Camera, Ruler, 
  Save, Plus, Trash2, FileText, Heart, Activity
} from 'lucide-react';
import { localDb, supabase, isSupabaseConfigured } from '../lib/supabase';

const initials = name => name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

export default function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const userRole = localStorage.getItem('user_role') || 'admin';
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const effectivePlayerId = id || '';

  // Get raw DB state
  const db = localDb.get();
  const playersList = db.profiles || [];
  const player = playersList.find(p => p.id?.toString() === effectivePlayerId);

  // Tab configurations
  const adminTabs = [
    { key: 'report', label: 'Önizleme Raporu', icon: Shield },
    { key: 'edit-1', label: '1. Kimlik & Genetik', icon: Shield },
    { key: 'edit-2', label: '2. Antropometri', icon: Ruler },
    { key: 'edit-3', label: '3. Teknik Analiz', icon: Activity },
    { key: 'edit-4', label: '4. Taktik & Mental', icon: Heart },
    { key: 'edit-5', label: '5. Coach Report', icon: FileText },
    { key: 'edit-6', label: '6. Takip & Hedefler', icon: Target }
  ];

  const studentTabs = [
    { key: 'report', label: 'Sporcu Raporu', icon: Shield },
    { key: 'goals', label: 'Hedefler', icon: Target }
  ];

  const tabs = isAdmin ? adminTabs : studentTabs;
  const [activeTab, setActiveTab] = useState('report');
  const [saveStatus, setSaveStatus] = useState('');

  // Password & Photo States
  const [passwordState, setPasswordState] = useState('');

  // Edit Forms States
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    birthDate: '',
    category: '',
    jerseyNumber: '',
    dominantHand: 'right',
    position: '',
    bio: '',
    status: 'active'
  });

  const [geneticsForm, setGeneticsForm] = useState({
    fatherHeight: '',
    motherHeight: '',
    targetHeight: '',
    allergy: '',
    note: ''
  });

  const [antroForm, setAntroForm] = useState([]);
  const [teknikForm, setTeknikForm] = useState([]);
  const [taktikForm, setTaktikForm] = useState([]);
  const [coachForm, setCoachForm] = useState([
    { title: 'Genel Sezon Değerlendirmesi', text: '' },
    { title: 'Teknik ve Oyun Kimliği', text: '' },
    { title: 'Liderlik ve Takım Kültürü', text: '' },
    { title: 'Mental Profil', text: '' },
    { title: 'Gelecek Sezon Beklentisi', text: '' }
  ]);
  const [goalsForm, setGoalsForm] = useState([]);
  const [trackingForm, setTrackingForm] = useState([]);

  // Initialize/Sync Form States when Player or Tab changes
  useEffect(() => {
    if (!player) return;

    const freshDb = localDb.get();
    
    // Profiles
    setProfileForm({
      fullName: player.fullName || '',
      birthDate: player.birthDate || '',
      category: player.category || '',
      jerseyNumber: player.jerseyNumber || '',
      dominantHand: player.dominantHand || 'right',
      position: player.position || '',
      bio: player.bio || '',
      status: player.status || 'active'
    });

    // Genetics
    const genetics = (freshDb.genetics || []).find(g => g.playerId?.toString() === effectivePlayerId);
    setGeneticsForm({
      fatherHeight: genetics?.fatherHeight || '',
      motherHeight: genetics?.motherHeight || '',
      targetHeight: genetics?.targetHeight || '',
      allergy: genetics?.allergy || '',
      note: genetics?.note || ''
    });

    // Antropometri - Load player's measurements (preserve all existing & custom metrics)
    const antro = (freshDb.antropometri || []).filter(m => m.playerId?.toString() === effectivePlayerId);
    if (antro.length > 0) {
      setAntroForm(antro);
    } else {
      const defaultMetrics = ['Boy', 'Kilo', 'Kulaç', 'Bel', 'Omuz', 'Bacak'];
      setAntroForm(defaultMetrics.map(metricName => ({ metric: metricName, val2025: '', val2026: '', change: '', comment: '' })));
    }

    // Skills
    const skills = (freshDb.skills || []).filter(s => s.playerId?.toString() === effectivePlayerId);
    setTeknikForm(skills.filter(s => s.type === 'teknik'));
    setTaktikForm(skills.filter(s => s.type === 'taktik'));

    // Coach Report
    const coachReport = (freshDb.coach_reports || []).find(r => r.playerId?.toString() === effectivePlayerId);
    if (coachReport?.report && Object.keys(coachReport.report).length > 0) {
      setCoachForm(Object.entries(coachReport.report).map(([title, text]) => ({ title, text: text || '' })));
    } else {
      setCoachForm([
        { title: 'Genel Sezon Değerlendirmesi', text: '' },
        { title: 'Teknik ve Oyun Kimliği', text: '' },
        { title: 'Liderlik ve Takım Kültürü', text: '' },
        { title: 'Mental Profil', text: '' },
        { title: 'Gelecek Sezon Beklentisi', text: '' }
      ]);
    }

    // Goals & Tracking (Takip)
    setGoalsForm((freshDb.goals || []).filter(g => g.playerId?.toString() === effectivePlayerId));
    setTrackingForm((freshDb.physicalMeasurements || []).filter(m => m.playerId?.toString() === effectivePlayerId));
  }, [effectivePlayerId, activeTab]);

  if (!player) return (
    <div className="empty-state">
      <div className="empty-state-icon">🏀</div>
      <p>Sporcu bulunamadı</p>
      {isAdmin && (
        <button className="btn btn-primary" onClick={() => navigate('/players')}>Geri Dön</button>
      )}
    </div>
  );

  // SAVE HANDLERS FOR EACH OF THE 6 SHEETS
  const saveDb = (updatedDb, message) => {
    localDb.set(updatedDb);
    setSaveStatus(message);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // 1. Kimlik & Genetik
  const handleSaveKimlikGenetik = () => {
    const currentDb = localDb.get();
    
    // Update profiles
    const pIdx = currentDb.profiles.findIndex(p => p.id?.toString() === effectivePlayerId);
    if (pIdx !== -1) {
      currentDb.profiles[pIdx] = {
        ...currentDb.profiles[pIdx],
        ...profileForm,
        jerseyNumber: parseInt(profileForm.jerseyNumber) || 0
      };
    }

    // Update genetics
    const gIdx = currentDb.genetics.findIndex(g => g.playerId?.toString() === effectivePlayerId);
    const existingG = gIdx !== -1 ? currentDb.genetics[gIdx] : null;
    const newGenetics = {
      ...(existingG?._id ? { _id: existingG._id } : {}),
      playerId: effectivePlayerId,
      ...geneticsForm
    };
    if (gIdx !== -1) {
      currentDb.genetics[gIdx] = newGenetics;
    } else {
      currentDb.genetics.push(newGenetics);
    }

    saveDb(currentDb, 'Kimlik ve Genetik bilgileri kaydedildi!');
  };

  // 2. Antropometri
  const handleSaveAntropometri = async () => {
    const currentDb = localDb.get();
    
    // Clean old antro entries for player
    currentDb.antropometri = (currentDb.antropometri || []).filter(m => m.playerId?.toString() !== effectivePlayerId);
    
    // Insert updated records
    const records = [];
    antroForm.forEach(item => {
      if (item.metric) {
        const record = {
          playerId: effectivePlayerId,
          date: new Date().toISOString().split('T')[0],
          ...item
        };
        currentDb.antropometri.push(record);
        records.push(record);
      }
    });

    saveDb(currentDb, 'Antropometri ölçümleri kaydedildi!');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('antropometri').delete().eq('player_id', effectivePlayerId);
        if (records.length > 0) {
          const mapped = records.map(a => ({
            player_id: a.playerId,
            date: a.date,
            metric: a.metric,
            val_2025: a.val2025?.toString(),
            val_2026: a.val_2026?.toString(),
            change_val: a.change?.toString(),
            comment: a.comment
          }));
          await supabase.from('antropometri').insert(mapped);
        }
      } catch (err) {
        console.error('Failed to sync antropometri to Supabase:', err);
      }
    }
  };

  // 3. Teknik Analiz
  const handleSaveTeknikAnaliz = async () => {
    const currentDb = localDb.get();
    
    // Clean old teknik skills for player
    currentDb.skills = (currentDb.skills || []).filter(s => !(s.playerId?.toString() === effectivePlayerId && s.type === 'teknik'));
    
    // Insert updated records
    const records = [];
    teknikForm.forEach(item => {
      if (item.name) {
        const record = {
          playerId: effectivePlayerId,
          type: 'teknik',
          ...item
        };
        currentDb.skills.push(record);
        records.push(record);
      }
    });

    saveDb(currentDb, 'Teknik Analiz becerileri kaydedildi!');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('skills').delete().eq('player_id', effectivePlayerId).eq('type', 'teknik');
        if (records.length > 0) {
          const mapped = records.map(s => ({
            player_id: s.playerId,
            name: s.name,
            type: s.type,
            rating: s.status,
            analysis: s.analysis
          }));
          await supabase.from('skills').insert(mapped);
        }
      } catch (err) {
        console.error('Failed to sync teknik skills to Supabase:', err);
      }
    }
  };

  // 4. Taktik & Mental
  const handleSaveTaktikMental = async () => {
    const currentDb = localDb.get();
    
    // Clean old taktik skills for player
    currentDb.skills = (currentDb.skills || []).filter(s => !(s.playerId?.toString() === effectivePlayerId && s.type === 'taktik'));
    
    // Insert updated records
    const records = [];
    taktikForm.forEach(item => {
      if (item.name) {
        const record = {
          playerId: effectivePlayerId,
          type: 'taktik',
          ...item
        };
        currentDb.skills.push(record);
        records.push(record);
      }
    });

    saveDb(currentDb, 'Taktik & Mental analiz bilgileri kaydedildi!');

    if (isSupabaseConfigured) {
      try {
        await supabase.from('skills').delete().eq('player_id', effectivePlayerId).eq('type', 'taktik');
        if (records.length > 0) {
          const mapped = records.map(s => ({
            player_id: s.playerId,
            name: s.name,
            type: s.type,
            rating: s.status,
            analysis: s.analysis
          }));
          await supabase.from('skills').insert(mapped);
        }
      } catch (err) {
        console.error('Failed to sync taktik skills to Supabase:', err);
      }
    }
  };

  // 5. Coach Report
  const handleSaveCoachReport = () => {
    const currentDb = localDb.get();
    
    if (!currentDb.coach_reports) currentDb.coach_reports = [];
    const reportIndex = currentDb.coach_reports.findIndex(r => r.playerId?.toString() === effectivePlayerId);
    const existingReport = reportIndex !== -1 ? currentDb.coach_reports[reportIndex] : null;

    const reportObj = {};
    if (Array.isArray(coachForm)) {
      coachForm.forEach(item => {
        const key = item.title?.trim();
        if (key) {
          reportObj[key] = item.text || '';
        }
      });
    }

    const newReport = {
      ...(existingReport?._id ? { _id: existingReport._id } : {}),
      playerId: effectivePlayerId,
      report: reportObj
    };

    if (reportIndex !== -1) {
      currentDb.coach_reports[reportIndex] = newReport;
    } else {
      currentDb.coach_reports.push(newReport);
    }

    saveDb(currentDb, 'Antrenör raporu başarıyla kaydedildi!');
  };

  // 6. Takip & Hedefler
  const handleSaveTakipHedefler = async () => {
    const currentDb = localDb.get();
    
    // Save goals
    currentDb.goals = (currentDb.goals || []).filter(g => g.playerId?.toString() !== effectivePlayerId);
    const goalsList = [];
    goalsForm.forEach(g => {
      if (g.title) {
        const record = {
          playerId: effectivePlayerId,
          ...g
        };
        currentDb.goals.push(record);
        goalsList.push(record);
      }
    });

    // Save quarterly tracking records
    currentDb.physicalMeasurements = (currentDb.physicalMeasurements || []).filter(m => m.playerId?.toString() !== effectivePlayerId);
    const trackingList = [];
    trackingForm.forEach(m => {
      if (m.date) {
        const record = {
          playerId: effectivePlayerId,
          ...m
        };
        currentDb.physicalMeasurements.push(record);
        trackingList.push(record);
      }
    });

    saveDb(currentDb, 'Takip Hedefleri ve Ölçüm Takvimi kaydedildi!');

    if (isSupabaseConfigured) {
      try {
        // Goals
        await supabase.from('goals').delete().eq('player_id', effectivePlayerId);
        if (goalsList.length > 0) {
          const mappedGoals = goalsList.map(g => ({
            player_id: g.playerId,
            category: g.category,
            title: g.title,
            status: g.status || 'active'
          }));
          await supabase.from('goals').insert(mappedGoals);
        }

        // Physical tracking history
        await supabase.from('physical_measurements').delete().eq('player_id', effectivePlayerId);
        if (trackingList.length > 0) {
          const mappedPM = trackingList.map(pm => ({
            player_id: pm.playerId,
            date: pm.date,
            height_cm: pm.heightCm?.toString(),
            weight_kg: pm.weightKg?.toString(),
            kulac: pm.kulac?.toString(),
            bel: pm.bel?.toString(),
            omuz: pm.omuz?.toString(),
            bacak: pm.bacak?.toString(),
            note: pm.note
          }));
          await supabase.from('physical_measurements').insert(mappedPM);
        }
      } catch (err) {
        console.error('Failed to sync goals/tracking to Supabase:', err);
      }
    }
  };

  // Helper lists & displays
  const getAge = (birthDate) => {
    if (!birthDate) return '—';
    const birthYear = parseInt(birthDate.split('.')[2]);
    if (isNaN(birthYear)) return '—';
    return new Date().getFullYear() - birthYear;
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dbCurrent = localDb.get();
        const profiles = dbCurrent.profiles || [];
        const index = profiles.findIndex(p => p.id?.toString() === effectivePlayerId);
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
    const index = profiles.findIndex(p => p.id?.toString() === effectivePlayerId);
    if (index !== -1) {
      profiles[index].password = passwordState;
      localDb.set(dbCurrent);
      setSaveStatus('Şifre başarıyla güncellendi!');
      setTimeout(() => setSaveStatus(''), 2000);
    }
  };

  return (
    <div>
      {/* HEADER ACTION AREA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        {isAdmin ? (
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
            fontSize: '0.75rem',
            fontWeight: 600
          }}>{saveStatus}</div>
        )}
      </div>

      {/* QUICK HERO SUMMARY HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface-2) 100%)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-6)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <div className="avatar avatar-xl" style={{ 
              boxShadow: 'var(--shadow-orange)',
              overflow: 'hidden',
              background: player.avatarUrl ? `url(${player.avatarUrl}) center/cover no-repeat` : 'var(--c-surface-3)'
            }}>
              {!player.avatarUrl && initials(player.fullName)}
            </div>
            
            {isAdmin && (
              <label style={{
                position: 'absolute', bottom: -5, right: -5,
                background: 'var(--c-primary)', color: 'white',
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifycontent: 'center',
                cursor: 'pointer', border: '2px solid var(--c-surface)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Camera size={12} />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 }}>
              {player.fullName}
            </h1>
            <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--c-text-2)', flexWrap: 'wrap' }}>
              <span>👕 Forma: #{player.jerseyNumber || '—'}</span>
              <span>📌 Pozisyon: {player.position || '—'}</span>
              <span>🎂 Yaş: {getAge(player.birthDate)}</span>
              <span>📊 Kategori: {player.category || '—'}</span>
            </div>
          </div>

          {isAdmin && (
            <div style={{
              background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)',
              padding: '10px 14px', border: '1px solid rgba(255,255,255,0.03)',
              display: 'flex', gap: 8, alignItems: 'center'
            }}>
              <div style={{ fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--c-text-3)' }}>Şifre:</div>
                <input 
                  type="text" 
                  style={{ background: 'var(--c-surface-2)', padding: '4px 8px', fontSize: '0.75rem', width: 70, border: '1px solid var(--c-border)' }}
                  placeholder={player.password || '10'}
                  value={passwordState}
                  onChange={e => setPasswordState(e.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" style={{ padding: '6px 10px', height: 'fit-content' }} onClick={handleUpdatePassword}>Güncelle</button>
            </div>
          )}
        </div>
      </div>

      {/* TABS CONTAINER */}
      <div className="tabs" style={{ marginBottom: 'var(--space-6)', overflowX: 'auto', display: 'flex', flexWrap: 'nowrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            style={{ whiteSpace: 'nowrap' }}
          >
            <tab.icon size={14} style={{ marginRight: 6 }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================
          TAB 1: ÖNİZLEME RAPORU / REPORT PREVIEW 
          ======================================================== */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Kimlik & Genetik Box */}
          {geneticsForm && (
            <div className="card">
              <div className="card-header"><div className="card-title">🧬 Genetik & Kimlik Bilgileri</div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Baba Boyu', val: geneticsForm.fatherHeight },
                  { label: 'Anne Boyu', val: geneticsForm.motherHeight },
                  { label: 'Tahmini Erişkin Boy', val: geneticsForm.targetHeight },
                  { label: 'Alerji', val: geneticsForm.allergy },
                ].filter(x => x.val).map(item => (
                  <div key={item.label} style={{ background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--c-text-3)', marginBottom: 4, textTransform: 'uppercase' }}>{item.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.val}</div>
                  </div>
                ))}
              </div>
              {geneticsForm.note && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.15)', borderRadius: 'var(--r-md)', fontSize: '0.82rem', color: 'var(--c-text-2)' }}>
                  💡 {geneticsForm.note}
                </div>
              )}
            </div>
          )}

          {/* Antropometri */}
          {antroForm.length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">📏 Antropometri Ölçümleri</div></div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Ölçüm</th><th>2025</th><th>2026</th><th>Değişim</th><th>Yorum</th></tr>
                  </thead>
                  <tbody>
                    {antroForm.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{m.metric}</td>
                        <td style={{ color: 'var(--c-text-3)' }}>{m.val2025 || '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--c-primary)' }}>{m.val2026 || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{m.change || '—'}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>{m.comment || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Skills Grid */}
          <div className="grid-2">
            {teknikForm.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title">🏀 Teknik Analiz</div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {teknikForm.map((skill, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)' }}>
                      <span style={{ fontSize: '1.1rem' }}>{skill.status}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{skill.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--c-text-3)' }}>{skill.analysis}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {taktikForm.length > 0 && (
              <div className="card">
                <div className="card-header"><div className="card-title">🧠 Taktik & Mental</div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {taktikForm.map((skill, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)' }}>
                      <span style={{ fontSize: '1.1rem' }}>{skill.status}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{skill.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--c-text-3)' }}>{skill.analysis}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coach Report */}
          {coachForm && coachForm.length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">📝 Antrenör Değerlendirmesi</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Array.isArray(coachForm) ? (
                  coachForm
                    .filter(sec => sec.title && sec.text)
                    .map((sec, idx) => (
                      <div key={idx}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--c-primary)', marginBottom: 6 }}>{sec.title}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--c-text-2)', padding: '10px 14px', background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--c-primary)' }}>{sec.text}</div>
                      </div>
                    ))
                ) : (
                  Object.entries(coachForm)
                    .filter(([k, v]) => k && v)
                    .map(([title, text]) => (
                      <div key={title}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--c-primary)', marginBottom: 6 }}>{title}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--c-text-2)', padding: '10px 14px', background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--c-primary)' }}>{text}</div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Goals */}
          {goalsForm.length > 0 && (
            <div className="card">
              <div className="card-header"><div className="card-title">🎯 Hedef Takip Tablosu</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {goalsForm.map((g, i) => (
                  <div key={i} style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--c-primary)', fontWeight: 700 }}>{g.category}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{g.title}</div>
                    </div>
                    <span className="badge badge-orange">🎯 Devam</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 2 (EDIT-1): 1. KİMLİK & GENETİK 
          ======================================================== */}
      {activeTab === 'edit-1' && (
        <div className="card">
          <div className="card-header"><div className="card-title">1. Kimlik & Genetik Bilgileri</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Left: General Profile */}
            <div>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 12, color: 'var(--c-primary)' }}>Genel Bilgiler</h3>
              <div className="form-group">
                <label className="form-label">Ad Soyad</label>
                <input type="text" className="form-input" value={profileForm.fullName} onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Doğum Tarihi</label>
                <input type="text" className="form-input" placeholder="örn. 13.10.2017" value={profileForm.birthDate} onChange={e => setProfileForm({ ...profileForm, birthDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Kategori</label>
                <input type="text" className="form-input" placeholder="örn. U9/U10" value={profileForm.category} onChange={e => setProfileForm({ ...profileForm, category: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Forma Numarası</label>
                <input type="number" className="form-input" value={profileForm.jerseyNumber} onChange={e => setProfileForm({ ...profileForm, jerseyNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Dominant El</label>
                <select className="form-input" value={profileForm.dominantHand} onChange={e => setProfileForm({ ...profileForm, dominantHand: e.target.value })}>
                  <option value="right">Sağ</option>
                  <option value="left">Sol</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Pozisyon / Rol</label>
                <input type="text" className="form-input" placeholder="örn. 1 - Oyun Kurucu" value={profileForm.position} onChange={e => setProfileForm({ ...profileForm, position: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Sporcu Durumu</label>
                <select className="form-input" value={profileForm.status} onChange={e => setProfileForm({ ...profileForm, status: e.target.value })}>
                  <option value="active">🟢 Aktif</option>
                  <option value="injured">🔴 Sakatlanmış (Sakat)</option>
                  <option value="inactive">🟡 Pasif (Aktif Değil)</option>
                </select>
              </div>
            </div>

            {/* Right: Genetic info */}
            <div>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 12, color: 'var(--c-primary)' }}>Genetik ve Sağlık</h3>
              <div className="form-group">
                <label className="form-label">Baba Boyu</label>
                <input type="text" className="form-input" placeholder="örn. 182 cm" value={geneticsForm.fatherHeight} onChange={e => setGeneticsForm({ ...geneticsForm, fatherHeight: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Anne Boyu</label>
                <input type="text" className="form-input" placeholder="örn. 175 cm" value={geneticsForm.motherHeight} onChange={e => setGeneticsForm({ ...geneticsForm, motherHeight: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Tahmini Erişkin Boy</label>
                <input type="text" className="form-input" placeholder="örn. 183.5 ± 8 cm" value={geneticsForm.targetHeight} onChange={e => setGeneticsForm({ ...geneticsForm, targetHeight: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Alerji / Sağlık Durumu</label>
                <input type="text" className="form-input" placeholder="örn. Var, net tanı yok" value={geneticsForm.allergy} onChange={e => setGeneticsForm({ ...geneticsForm, allergy: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Genetik Değerlendirme / Notlar</label>
                <textarea rows={4} className="form-input" placeholder="Yorum ekleyin..." value={geneticsForm.note} onChange={e => setGeneticsForm({ ...geneticsForm, note: e.target.value })} />
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSaveKimlikGenetik} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={16} /> Kaydet
          </button>
        </div>
      )}

      {/* ========================================================
          TAB 3 (EDIT-2): 2. ANTROPOMETRİ 
          ======================================================== */}
      {activeTab === 'edit-2' && (
        <div className="card">
          <div className="card-header"><div className="card-title">2. Antropometrik Gelişim Ölçümleri</div></div>
          <div className="table-wrapper" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Ölçüm Tipi</th>
                  <th>2025 Değeri</th>
                  <th>2026 Değeri</th>
                  <th>Değişim Farkı</th>
                  <th>Bilimsel Yorum / Notlar</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {antroForm.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }} 
                        value={item.metric} 
                        onChange={e => {
                          const updated = [...antroForm];
                          updated[idx].metric = e.target.value;
                          setAntroForm(updated);
                        }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }} 
                        value={item.val2025} 
                        onChange={e => {
                          const updated = [...antroForm];
                          updated[idx].val2025 = e.target.value;
                          setAntroForm(updated);
                        }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }} 
                        value={item.val2026} 
                        onChange={e => {
                          const updated = [...antroForm];
                          updated[idx].val2026 = e.target.value;
                          setAntroForm(updated);
                        }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }} 
                        value={item.change} 
                        onChange={e => {
                          const updated = [...antroForm];
                          updated[idx].change = e.target.value;
                          setAntroForm(updated);
                        }}
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }} 
                        value={item.comment} 
                        onChange={e => {
                          const updated = [...antroForm];
                          updated[idx].comment = e.target.value;
                          setAntroForm(updated);
                        }}
                      />
                    </td>
                    <td>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => {
                          const updated = antroForm.filter((_, i) => i !== idx);
                          setAntroForm(updated);
                        }}
                      >
                        <Trash2 size={14} style={{ color: 'var(--c-red)' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => setAntroForm([...antroForm, { metric: '', val2025: '', val2026: '', change: '', comment: '' }])}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Satır Ekle
            </button>
            <button className="btn btn-primary" onClick={handleSaveAntropometri} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> Kaydet
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4 (EDIT-3): 3. TEKNİK ANALİZ 
          ======================================================== */}
      {activeTab === 'edit-3' && (
        <div className="card">
          <div className="card-header"><div className="card-title">3. Teknik Analiz Becerileri</div></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {teknikForm.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)', padding: 12, border: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Beceri Adı</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={item.name} 
                      onChange={e => {
                        const updated = [...teknikForm];
                        updated[idx].name = e.target.value;
                        setTeknikForm(updated);
                      }} 
                    />
                  </div>
                  <div style={{ width: 140 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Seviye (Emoji)</label>
                    <select 
                      className="form-input" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={item.status} 
                      onChange={e => {
                        const updated = [...teknikForm];
                        updated[idx].status = e.target.value;
                        setTeknikForm(updated);
                      }}
                    >
                      <option value="🟢">🟢 Güçlü Yön</option>
                      <option value="🟡">🟡 Gelişim Alanı</option>
                      <option value="🔴">🔴 Zayıf Yön</option>
                    </select>
                  </div>
                  <button 
                    className="btn btn-ghost" 
                    style={{ marginTop: 20 }}
                    onClick={() => {
                      const updated = teknikForm.filter((_, i) => i !== idx);
                      setTeknikForm(updated);
                    }}
                  >
                    <Trash2 size={16} style={{ color: 'var(--c-red)' }} />
                  </button>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Analiz ve Yorum</label>
                  <textarea 
                    rows={2} 
                    className="form-input" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    value={item.analysis} 
                    onChange={e => {
                      const updated = [...teknikForm];
                      updated[idx].analysis = e.target.value;
                      setTeknikForm(updated);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => setTeknikForm([...teknikForm, { name: '', status: '🟡', analysis: '' }])}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Beceri Ekle
            </button>
            <button className="btn btn-primary" onClick={handleSaveTeknikAnaliz} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> Kaydet
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5 (EDIT-4): 4. TAKTİK & MENTAL 
          ======================================================== */}
      {activeTab === 'edit-4' && (
        <div className="card">
          <div className="card-header"><div className="card-title">4. Taktik, Mental & Fiziksel Analiz</div></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {taktikForm.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)', padding: 12, border: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Alan / Beceri</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={item.name} 
                      onChange={e => {
                        const updated = [...taktikForm];
                        updated[idx].name = e.target.value;
                        setTaktikForm(updated);
                      }} 
                    />
                  </div>
                  <div style={{ width: 140 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Seviye</label>
                    <select 
                      className="form-input" 
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      value={item.status} 
                      onChange={e => {
                        const updated = [...taktikForm];
                        updated[idx].status = e.target.value;
                        setTaktikForm(updated);
                      }}
                    >
                      <option value="🟢">🟢 Güçlü Yön</option>
                      <option value="🟡">🟡 Gelişim Alanı</option>
                      <option value="🔴">🔴 Zayıf Yön</option>
                    </select>
                  </div>
                  <button 
                    className="btn btn-ghost" 
                    style={{ marginTop: 20 }}
                    onClick={() => {
                      const updated = taktikForm.filter((_, i) => i !== idx);
                      setTaktikForm(updated);
                    }}
                  >
                    <Trash2 size={16} style={{ color: 'var(--c-red)' }} />
                  </button>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Detaylı Analiz</label>
                  <textarea 
                    rows={2} 
                    className="form-input" 
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    value={item.analysis} 
                    onChange={e => {
                      const updated = [...taktikForm];
                      updated[idx].analysis = e.target.value;
                      setTaktikForm(updated);
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => setTaktikForm([...taktikForm, { name: '', status: '🟢', analysis: '' }])}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Satır Ekle
            </button>
            <button className="btn btn-primary" onClick={handleSaveTaktikMental} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> Kaydet
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6 (EDIT-5): 5. COACH REPORT 
          ======================================================== */}
      {activeTab === 'edit-5' && (
        <div className="card">
          <div className="card-header"><div className="card-title">5. Antrenör Değerlendirme Raporu</div></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
            {Array.isArray(coachForm) && coachForm.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--c-surface-3)', borderRadius: 'var(--r-md)', padding: 14, border: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-primary)' }}>Rapor Başlığı / Konu</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ padding: '6px 10px', fontSize: '0.85rem', fontWeight: 600 }}
                      placeholder="örn. Genel Sezon Değerlendirmesi"
                      value={item.title} 
                      onChange={e => {
                        const updated = [...coachForm];
                        updated[idx].title = e.target.value;
                        setCoachForm(updated);
                      }} 
                    />
                  </div>
                  <button 
                    className="btn btn-ghost" 
                    title="Satırı / Bölümü Sil"
                    style={{ marginTop: 18 }}
                    onClick={() => {
                      const updated = coachForm.filter((_, i) => i !== idx);
                      setCoachForm(updated);
                    }}
                  >
                    <Trash2 size={16} style={{ color: 'var(--c-red)' }} />
                  </button>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Değerlendirme Açıklaması</label>
                  <textarea 
                    rows={3} 
                    className="form-input" 
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    placeholder="Antrenör değerlendirme metnini yazın..."
                    value={item.text} 
                    onChange={e => {
                      const updated = [...coachForm];
                      updated[idx].text = e.target.value;
                      setCoachForm(updated);
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className="btn btn-ghost" 
              onClick={() => setCoachForm([...coachForm, { title: '', text: '' }])}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} /> Satır / Bölüm Ekle
            </button>
            <button className="btn btn-primary" onClick={handleSaveCoachReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={16} /> Kaydet
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 7 (EDIT-6): 6. TAKİP & HEDEFLER 
          ======================================================== */}
      {activeTab === 'edit-6' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Tracking calendar history */}
          <div className="card">
            <div className="card-header"><div className="card-title">Gelişim Ölçüm Takip Tarihleri (Quarterly Tracking)</div></div>
            <div className="table-wrapper" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Dönem Tarihi</th>
                    <th>Boy</th>
                    <th>Kilo</th>
                    <th>Kulaç</th>
                    <th>Bel</th>
                    <th>Omuz</th>
                    <th>Bacak</th>
                    <th>Yorum / Not</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {trackingForm.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <input 
                          type="text" 
                          placeholder="30.09.2026" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }} 
                          value={item.date} 
                          onChange={e => {
                            const updated = [...trackingForm];
                            updated[idx].date = e.target.value;
                            setTrackingForm(updated);
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: 60, border: '1px solid var(--c-border)' }} 
                          value={item.heightCm || ''} 
                          onChange={e => {
                            const updated = [...trackingForm];
                            updated[idx].heightCm = e.target.value;
                            setTrackingForm(updated);
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: 60, border: '1px solid var(--c-border)' }} 
                          value={item.weightKg || ''} 
                          onChange={e => {
                            const updated = [...trackingForm];
                            updated[idx].weightKg = e.target.value;
                            setTrackingForm(updated);
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: 60, border: '1px solid var(--c-border)' }} 
                          value={item.kulac || ''} 
                          onChange={e => {
                            const updated = [...trackingForm];
                            updated[idx].kulac = e.target.value;
                            setTrackingForm(updated);
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: 60, border: '1px solid var(--c-border)' }} 
                          value={item.bel || ''} 
                          onChange={e => {
                            const updated = [...trackingForm];
                            updated[idx].bel = e.target.value;
                            setTrackingForm(updated);
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: 60, border: '1px solid var(--c-border)' }} 
                          value={item.omuz || ''} 
                          onChange={e => {
                            const updated = [...trackingForm];
                            updated[idx].omuz = e.target.value;
                            setTrackingForm(updated);
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: 60, border: '1px solid var(--c-border)' }} 
                          value={item.bacak || ''} 
                          onChange={e => {
                            const updated = [...trackingForm];
                            updated[idx].bacak = e.target.value;
                            setTrackingForm(updated);
                          }} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }} 
                          value={item.note || ''} 
                          onChange={e => {
                            const updated = [...trackingForm];
                            updated[idx].note = e.target.value;
                            setTrackingForm(updated);
                          }} 
                        />
                      </td>
                      <td>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => {
                            const updated = trackingForm.filter((_, i) => i !== idx);
                            setTrackingForm(updated);
                          }}
                        >
                          <Trash2 size={14} style={{ color: 'var(--c-red)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTrackingForm([...trackingForm, { date: '', heightCm: '', weightKg: '', kulac: '', bel: '', omuz: '', bacak: '', note: '' }])}>
              <Plus size={14} /> Tarih Dönemi Ekle
            </button>
          </div>

          {/* Development goals list */}
          <div className="card">
            <div className="card-header"><div className="card-title">3 Aylık / Sezonluk Hedefler</div></div>
            <div className="table-wrapper" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr>
                    <th>Gelişim Alanı</th>
                    <th>Hedef Tanımı</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {goalsForm.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ width: 150 }}>
                        <select 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }}
                          value={item.category} 
                          onChange={e => {
                            const updated = [...goalsForm];
                            updated[idx].category = e.target.value;
                            setGoalsForm(updated);
                          }}
                        >
                          <option value="Teknik">Teknik</option>
                          <option value="Taktik">Taktik</option>
                          <option value="Mental">Mental</option>
                          <option value="Fiziksel">Fiziksel</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }}
                          value={item.title} 
                          onChange={e => {
                            const updated = [...goalsForm];
                            updated[idx].title = e.target.value;
                            setGoalsForm(updated);
                          }}
                        />
                      </td>
                      <td style={{ width: 140 }}>
                        <select 
                          className="form-input" 
                          style={{ padding: '4px 8px', fontSize: '0.8rem', border: '1px solid var(--c-border)' }}
                          value={item.status} 
                          onChange={e => {
                            const updated = [...goalsForm];
                            updated[idx].status = e.target.value;
                            setGoalsForm(updated);
                          }}
                        >
                          <option value="active">🎯 Devam</option>
                          <option value="achieved">✅ Tamamlandı</option>
                          <option value="missed">❌ Kaçırıldı</option>
                        </select>
                      </td>
                      <td>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => {
                            const updated = goalsForm.filter((_, i) => i !== idx);
                            setGoalsForm(updated);
                          }}
                        >
                          <Trash2 size={14} style={{ color: 'var(--c-red)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setGoalsForm([...goalsForm, { category: 'Teknik', title: '', status: 'active' }])}>
                <Plus size={14} /> Yeni Hedef Ekle
              </button>
              <button className="btn btn-primary" onClick={handleSaveTakipHedefler} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={16} /> Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

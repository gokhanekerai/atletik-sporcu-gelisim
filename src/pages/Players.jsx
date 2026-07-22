import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Plus, ChevronRight, X, Trash2, Save, Sparkles } from 'lucide-react';
import { localDb, supabase, isSupabaseConfigured, normalizeName } from '../lib/supabase';

const initials = name => name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

export default function Players() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [db, setDb] = useState(() => localDb.get());
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [posFilter, setPosFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const refresh = () => setDb(localDb.get());
    window.addEventListener('auth-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('auth-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [newPlayer, setNewPlayer] = useState({
    fullName: '',
    email: '',
    password: '',
    jerseyNumber: '',
    category: 'U9/U10',
    position: '1 – Oyun Kurucu',
    dominantHand: 'right',
    birthDate: '',
    status: 'active'
  });

  const players = db.profiles || [];

  // Filter players list
  const filtered = players.filter(p => {
    const matchName = p.fullName?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    const matchPos = posFilter === 'all' || p.position === posFilter;
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchName && matchCat && matchPos && matchStatus && p.role !== 'admin' && p.role !== 'super_admin';
  });

  const getAge = (birthDate) => {
    if (!birthDate) return '—';
    const birthYear = parseInt(birthDate.split('.')[2]);
    if (isNaN(birthYear)) return '—';
    return new Date().getFullYear() - birthYear;
  };

  // Add new player manually
  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!newPlayer.fullName || !newPlayer.email || !newPlayer.password) {
      alert('Lütfen sporcu adı, e-posta ve şifresini eksiksiz girin.');
      return;
    }

    const currentDb = localDb.get();
    const existingPlayers = currentDb.profiles || [];

    // Duplicate name check
    const normalizedInputName = normalizeName(newPlayer.fullName);
    const existingMatch = existingPlayers.find(p => normalizeName(p.fullName) === normalizedInputName);

    if (existingMatch) {
      const confirmAdd = window.confirm(
        `⚠️ UYARI: "${newPlayer.fullName}" isminde bir sporcu sistemde zaten kayıtlı!\n\nYine de aynı isim ve soyisimle yeni bir sporcu eklemek istediğinizden emin misiniz?`
      );
      if (!confirmAdd) {
        return; // Kullanıcı onaylamadı -> Sporcu eklenmesin!
      }
      localDb.unmarkDeleted(newPlayer.fullName);
    }

    const newId = `player_${Date.now()}`;

    // Add profile
    const newProfile = {
      id: newId,
      fullName: newPlayer.fullName,
      email: newPlayer.email,
      password: newPlayer.password,
      jerseyNumber: parseInt(newPlayer.jerseyNumber) || 0,
      category: newPlayer.category,
      position: newPlayer.position,
      dominantHand: newPlayer.dominantHand,
      birthDate: newPlayer.birthDate,
      role: 'student',
      status: newPlayer.status,
      avatarUrl: null
    };

    if (!currentDb.profiles) currentDb.profiles = [];
    currentDb.profiles.push(newProfile);

    // Seed default genetics matching Excel structure
    if (!currentDb.genetics) currentDb.genetics = [];
    currentDb.genetics.push({
      playerId: newId,
      fatherHeight: '—',
      motherHeight: '—',
      targetHeight: '—',
      allergy: 'Yok',
      note: ''
    });

    // Seed default antropometri metrics matching Excel structure
    if (!currentDb.antropometri) currentDb.antropometri = [];
    const defaultMetrics = ['Boy', 'Kilo', 'Kulaç', 'Bel', 'Omuz', 'Bacak'];
    defaultMetrics.forEach(m => {
      currentDb.antropometri.push({
        playerId: newId,
        date: new Date().toISOString().split('T')[0],
        metric: m,
        val2025: '—',
        val2026: '—',
        change: '—',
        comment: ''
      });
    });

    // Seed default skills matching Excel structure
    if (!currentDb.skills) currentDb.skills = [];
    const defaultTeknik = ['Sol El Gelişimi', 'Sağ El Bitirişleri', 'Şut Mekaniği', 'Top Advance', 'Skip & Go', 'Ball Handling', 'Akselerasyon/Deselerasyon'];
    defaultTeknik.forEach(s => {
      currentDb.skills.push({
        playerId: newId,
        type: 'teknik',
        name: s,
        status: '🟡',
        analysis: ''
      });
    });

    const defaultTaktik = ['Basketbol IQ', 'Yardım Savunması', 'Liderlik', 'Mücadele Gücü', 'Temaslı Oyun', 'Savunma Kimliği'];
    defaultTaktik.forEach(s => {
      currentDb.skills.push({
        playerId: newId,
        type: 'taktik',
        name: s,
        status: '🟢',
        analysis: ''
      });
    });

    // Seed empty coach report
    if (!currentDb.coach_reports) currentDb.coach_reports = [];
    currentDb.coach_reports.push({
      playerId: newId,
      report: {
        'Genel Sezon Değerlendirmesi': '',
        'Teknik ve Oyun Kimliği': '',
        'Liderlik ve Takım Kültürü': '',
        'Mental Profil': '',
        'Gelecek Sezon Beklentisi': ''
      }
    });

    // Save database
    localDb.set(currentDb);
    setDb(currentDb);
    window.dispatchEvent(new Event('auth-changed'));

    // Reset state & close modal
    setNewPlayer({
      fullName: '',
      email: '',
      password: '',
      jerseyNumber: '',
      category: 'U9/U10',
      position: '1 – Oyun Kurucu',
      dominantHand: 'right',
      birthDate: '',
      status: 'active'
    });
    setIsModalOpen(false);
  };

  // Delete player profiles
  const handleDeletePlayer = async (playerId) => {
    if (!playerId) return;
    setDeletingId(playerId);

    const currentDb = localDb.get();
    const targetPlayer = (currentDb.profiles || []).find(p => p.id?.toString() === playerId.toString());
    const strId = playerId.toString();
    const fullName = targetPlayer?.fullName || '';
    const normName = normalizeName(fullName);

    // Mark player ID and Name as permanently deleted in local registry
    localDb.markDeleted(strId, fullName);

    if (isSupabaseConfigured) {
      try {
        // Delete child records first to prevent FK constraint violations
        await supabase.from('antropometri').delete().eq('player_id', strId);
        await supabase.from('skills').delete().eq('player_id', strId);
        await supabase.from('coach_reports').delete().eq('player_id', strId);
        await supabase.from('goals').delete().eq('player_id', strId);
        await supabase.from('genetics').delete().eq('player_id', strId);
        await supabase.from('physical_measurements').delete().eq('player_id', strId);

        // Delete profile and mark status as deleted in cloud
        await supabase.from('profiles').delete().eq('id', strId);
        if (fullName) {
          await supabase.from('profiles').delete().eq('full_name', fullName);
        }
        await supabase.from('profiles').update({ status: 'deleted' }).eq('id', strId);
      } catch(err) {
        console.warn('Supabase cloud delete exception (local deletion will persist):', err);
      }
    }

    // Clean all entries related to playerId or fullName
    currentDb.profiles = (currentDb.profiles || []).filter(p => {
      const pIdMatch = p.id?.toString() === strId;
      const pNameMatch = normName && normalizeName(p.fullName) === normName;
      return !pIdMatch && !pNameMatch;
    });
    currentDb.genetics = (currentDb.genetics || []).filter(g => g.playerId?.toString() !== strId);
    currentDb.antropometri = (currentDb.antropometri || []).filter(m => m.playerId?.toString() !== strId);
    currentDb.skills = (currentDb.skills || []).filter(s => s.playerId?.toString() !== strId);
    currentDb.coach_reports = (currentDb.coach_reports || []).filter(r => r.playerId?.toString() !== strId);
    currentDb.goals = (currentDb.goals || []).filter(g => g.playerId?.toString() !== strId);
    currentDb.physicalMeasurements = (currentDb.physicalMeasurements || []).filter(m => m.playerId?.toString() !== strId);

    localDb.set(currentDb);
    setDb(currentDb);
    setDeletingId(null);
    setConfirmDeleteId(null);
    window.dispatchEvent(new Event('auth-changed'));
  };

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Sporcular</h1>
          <p>{filtered.length} sporcu listelendi (Excel veri tabanlı)</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/excel-import', { state: { tab: 'gpt' } })} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={16} style={{ color: 'var(--c-primary)' }} /> ChatGPT ile Hızlı Aktar
          </button>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Yeni Sporcu Ekle
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
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
        
        <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Tüm Kategoriler</option>
          <option value="U9/U10">U9/U10</option>
          <option value="U11">U11</option>
          <option value="U12">U12</option>
          <option value="U14">U14</option>
          {[...new Set(players.map(p => p.category).filter(c => c && !['U9/U10', 'U11', 'U12', 'U14'].includes(c)))].map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select className="filter-select" value={posFilter} onChange={e => setPosFilter(e.target.value)}>
          <option value="all">Tüm Pozisyonlar</option>
          <option value="1 – Oyun Kurucu">1 – Oyun Kurucu</option>
          <option value="2 – Şutör Guard">2 – Şutör Guard</option>
          <option value="3 – Kısa Forvet">3 – Kısa Forvet</option>
          <option value="4 – Uzun Forvet">4 – Uzun Forvet</option>
          <option value="5 – Pivot">5 – Pivot</option>
        </select>

        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="injured">Sakat</option>
          <option value="inactive">Pasif</option>
        </select>
      </div>

      {/* PLAYERS LIST */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏀</div>
          <p>{t('common.noData')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(player => {
            const age = getAge(player.birthDate);
            
            // Excel data counters
            const antroCount = (db.antropometri || []).filter(m => m.playerId?.toString() === player.id?.toString()).length;
            const skillsCount = (db.skills || []).filter(s => s.playerId?.toString() === player.id?.toString()).length;
            const goalsCount = (db.goals || []).filter(g => g.playerId?.toString() === player.id?.toString()).length;

            return (
              <div
                key={player.id}
                className="player-card"
                onClick={() => navigate(`/players/${player.id}`)}
                style={{ cursor: 'pointer' }}
              >
                {/* Jersey Number */}
                <div style={{
                  width: 36, textAlign: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 900,
                  fontSize: '1.1rem', color: 'var(--c-text-3)',
                }}>
                  #{player.jerseyNumber || '—'}
                </div>

                {/* Avatar */}
                <div className="avatar avatar-lg" style={{
                  overflow: 'hidden',
                  background: player.avatarUrl ? `url(${player.avatarUrl}) center/cover no-repeat` : undefined
                }}>
                  {!player.avatarUrl && initials(player.fullName)}
                </div>

                {/* Info */}
                <div className="player-card-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4, flexWrap: 'wrap' }}>
                    <div className="player-card-name" style={{ fontSize: '1rem', fontWeight: 700 }}>{player.fullName}</div>
                    {player.position && <div className={`pos-chip pos-PG`} style={{ width: 'auto', padding: '2px 8px', fontSize: '0.75rem' }}>{player.position}</div>}
                    <div className={`badge badge-${player.status === 'active' ? 'green' : player.status === 'injured' ? 'red' : 'yellow'}`}>
                      {player.status === 'active' ? '● Aktif' : player.status === 'injured' ? '⚠ Sakatlanmış' : '○ Pasif'}
                    </div>
                  </div>
                  <div className="player-card-meta">
                    <span>📌 {player.category || '—'}</span>
                    <span>·</span>
                    <span>{age} yaş</span>
                    <span>·</span>
                    <span>{player.dominantHand === 'right' ? '🤜 Sağ El' : '🤛 Sol El'}</span>
                  </div>
                </div>

                {/* Excel Stats summary */}
                <div className="player-card-stats" style={{ gap: 12 }}>
                  <div className="player-card-stat">
                    <span className="player-card-stat-val" style={{ color: 'var(--c-primary)' }}>{antroCount}</span>
                    <span className="player-card-stat-lbl">Ölçüm</span>
                  </div>
                  <div className="player-card-stat">
                    <span className="player-card-stat-val" style={{ color: 'var(--c-accent)' }}>{skillsCount}</span>
                    <span className="player-card-stat-lbl">Beceri</span>
                  </div>
                  <div className="player-card-stat">
                    <span className="player-card-stat-val" style={{ color: 'var(--c-purple)' }}>{goalsCount}</span>
                    <span className="player-card-stat-lbl">Hedef</span>
                  </div>
                </div>

                {/* Actions */}
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(player.id);
                  }}
                  disabled={deletingId === player.id}
                  style={{ marginRight: 8, opacity: deletingId === player.id ? 0.5 : 1 }}
                >
                  {deletingId === player.id ? (
                    <span className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--c-red)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Trash2 size={16} style={{ color: 'var(--c-red)' }} />
                  )}
                </button>

                <ChevronRight size={16} style={{ color: 'var(--c-text-3)', flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--c-bg)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)',
            width: '90%', maxWidth: 400, boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ marginTop: 0, color: 'var(--c-red)' }}>Sporcuyu Sil</h3>
            <p>Bu sporcuyu ve sporcuyla ilgili tüm verileri kalıcı olarak silmek istediğinize emin misiniz?</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>İptal</button>
              <button className="btn btn-primary" style={{ background: 'var(--c-red)', borderColor: 'var(--c-red)' }} onClick={() => {
                const id = confirmDeleteId;
                setConfirmDeleteId(null);
                handleDeletePlayer(id);
              }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PLAYER FORM MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, margin: '0 auto', background: 'var(--c-surface)', position: 'relative' }}>
            <button 
              style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'var(--c-text-3)', cursor: 'pointer' }}
              onClick={() => setIsModalOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, marginBottom: 20, color: 'var(--c-primary)' }}>
              Yeni Sporcu Ekle
            </h2>
            
            <form onSubmit={handleAddPlayer}>
              <div className="form-group">
                <label className="form-label">Ad Soyad *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={newPlayer.fullName} 
                  onChange={e => setNewPlayer({ ...newPlayer, fullName: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-posta Adresi (Giriş İçin) *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  required
                  placeholder="örn. sporcuadi@atletik.com"
                  value={newPlayer.email} 
                  onChange={e => setNewPlayer({ ...newPlayer, email: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Giriş Şifresi *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={newPlayer.password} 
                  onChange={e => setNewPlayer({ ...newPlayer, password: e.target.value })} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Forma Numarası</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newPlayer.jerseyNumber} 
                    onChange={e => setNewPlayer({ ...newPlayer, jerseyNumber: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Doğum Tarihi</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="örn. 13.10.2017"
                    value={newPlayer.birthDate} 
                    onChange={e => setNewPlayer({ ...newPlayer, birthDate: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select 
                    className="form-input" 
                    value={newPlayer.category} 
                    onChange={e => setNewPlayer({...newPlayer, category: e.target.value})}
                  >
                    <option value="U9/U10">U9/U10</option>
                    <option value="U11">U11</option>
                    <option value="U12">U12</option>
                    <option value="U14">U14</option>
                    {[...new Set(players.map(p => p.category).filter(c => c && !['U9/U10', 'U11', 'U12', 'U14'].includes(c)))].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pozisyon</label>
                  <select 
                    className="form-input" 
                    value={newPlayer.position} 
                    onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                  >
                    <option value="1 – Oyun Kurucu">1 – Oyun Kurucu</option>
                    <option value="2 – Şutör Guard">2 – Şutör Guard</option>
                    <option value="3 – Kısa Forvet">3 – Kısa Forvet</option>
                    <option value="4 – Uzun Forvet">4 – Uzun Forvet</option>
                    <option value="5 – Pivot">5 – Pivot</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Dominant El</label>
                  <select 
                    className="form-input" 
                    value={newPlayer.dominantHand} 
                    onChange={e => setNewPlayer({ ...newPlayer, dominantHand: e.target.value })}
                  >
                    <option value="right">Sağ</option>
                    <option value="left">Sol</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Durum</label>
                  <select 
                    className="form-input" 
                    value={newPlayer.status} 
                    onChange={e => setNewPlayer({ ...newPlayer, status: e.target.value })}
                  >
                    <option value="active">Aktif</option>
                    <option value="injured">Sakat</option>
                    <option value="inactive">Pasif</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>İptal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Save size={16} /> Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

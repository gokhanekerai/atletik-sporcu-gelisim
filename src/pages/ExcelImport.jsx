import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUp, CheckCircle, AlertTriangle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { isSupabaseConfigured, supabase, localDb } from '../lib/supabase';

export default function ExcelImport() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcel(selectedFile);
    }
  };

  const parseExcel = (file) => {
    setLoading(true);
    setStatus({ type: '', message: '' });
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const result = {};
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          result[sheetName] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        });

        // Analyze and map data structures
        const structured = analyzeParsedData(result);
        setParsedData(structured);
        setStatus({ type: 'success', message: 'Excel dosyası başarıyla çözümlendi.' });
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Excel ayrıştırılırken bir hata oluştu. Şablonu kontrol edin.' });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const analyzeParsedData = (sheets) => {
    // 1. Kimlik & Genetik
    const kimlikSheet = sheets['1-Kimlik_Genetik'] || [];
    const kimlik = {};
    let geneticNote = '';

    kimlikSheet.forEach(row => {
      if (!row || row.length === 0) return;
      const key = row[0]?.toString()?.trim();
      const val = row[1];
      
      if (key === 'Doğum Tarihi') kimlik.birthDate = val;
      if (key === 'Kategori') kimlik.category = val;
      if (key === 'Baba Boyu') kimlik.fatherHeight = val;
      if (key === 'Anne Boyu') kimlik.motherHeight = val;
      if (key === 'Tahmini Erişkin Boy') kimlik.targetHeight = val;
      if (key === 'Alerji') kimlik.allergy = val;
      
      // Look for notes in row[3] (index 3)
      if (row[3]) {
        geneticNote = row[3];
      }
    });

    // Check title/header for full name
    const headerRow = kimlikSheet[0];
    const fullName = headerRow ? headerRow[0]?.toString()?.split('|')[0]?.trim() : 'Bilinmeyen Sporcu';

    // 2. Antropometri
    const antropometriSheet = sheets['2-Antropometri'] || [];
    const measurements = [];
    const headers = antropometriSheet[0] || [];
    
    // We assume rows 1 onwards are measurements (Boy, Kilo, Kulaç, Bel, Omuz, Bacak)
    for (let i = 1; i < antropometriSheet.length; i++) {
      const row = antropometriSheet[i];
      if (row && row[0]) {
        measurements.push({
          metric: row[0],
          val2025: row[1],
          val2026: row[2],
          change: row[3],
          comment: row[4]
        });
      }
    }

    // 3. Teknik Analiz
    const teknikSheet = sheets['3-Teknik_Analiz'] || [];
    const teknikSkills = [];
    for (let i = 1; i < teknikSheet.length; i++) {
      const row = teknikSheet[i];
      if (row && row[0]) {
        teknikSkills.push({
          name: row[0],
          status: row[1],
          analysis: row[2]
        });
      }
    }

    // 4. Taktik & Mental
    const taktikSheet = sheets['4-Taktik_Mental'] || [];
    const taktikSkills = [];
    for (let i = 1; i < taktikSheet.length; i++) {
      const row = taktikSheet[i];
      if (row && row[0]) {
        taktikSkills.push({
          name: row[0],
          status: row[1],
          analysis: row[2]
        });
      }
    }

    // 5. Coach Report
    const coachSheet = sheets['5-Coach_Report'] || [];
    const coachReport = {};
    for (let i = 0; i < coachSheet.length; i += 2) {
      const titleRow = coachSheet[i];
      const textRow = coachSheet[i + 1];
      if (titleRow && textRow) {
        coachReport[titleRow[0]] = textRow[0];
      }
    }

    // 6. Takip Hedefler
    const hedeflerSheet = sheets['6-Takip_Hedefler'] || [];
    const goalsList = [];
    for (let i = 1; i < hedeflerSheet.length; i++) {
      const row = hedeflerSheet[i];
      if (row && row[0]) {
        goalsList.push({
          category: row[0],
          title: row[1]
        });
      }
    }

    return {
      fullName,
      kimlik,
      geneticNote,
      measurements,
      teknikSkills,
      taktikSkills,
      coachReport,
      goalsList
    };
  };

  const handleSaveToDatabase = async () => {
    if (!parsedData) return;
    setLoading(true);
    setStatus({ type: '', message: '' });

    const newPlayerId = Date.now().toString(); // unique ID simulation

    if (isSupabaseConfigured) {
      try {
        // 1. Create Supabase profile/player
        const { data: player, error: playerError } = await supabase
          .from('profiles')
          .insert({
            full_name: parsedData.fullName,
            role: 'student',
            birth_date: parsedData.kimlik.birthDate,
            position: '1 (Oyun Kurucu)', // Default
            jersey_number: 0, // Default cover number
            status: 'active'
          })
          .select()
          .single();

        if (playerError) throw playerError;

        // 2. Insert genetics
        const { error: genError } = await supabase.from('genetics').insert({
          player_id: player.id,
          father_height: parseFloat(parsedData.kimlik.fatherHeight) || 0,
          mother_height: parseFloat(parsedData.kimlik.motherHeight) || 0,
          genetics_note: parsedData.geneticNote
        });
        if (genError) throw genError;

        // 3. Insert antropometri
        const anthroInserts = parsedData.measurements.map(m => ({
          player_id: player.id,
          metric: m.metric,
          val_2025: m.val2025?.toString(),
          val_2026: m.val2026?.toString(),
          change_val: m.change,
          comment: m.comment
        }));
        const { error: anthroError } = await supabase.from('antropometri').insert(anthroInserts);
        if (anthroError) throw anthroError;

        // 4. Insert skills (teknik + taktik)
        const skillInserts = [
          ...parsedData.teknikSkills.map(s => ({
            player_id: player.id,
            name: s.name,
            type: 'teknik',
            rating: s.status,
            analysis: s.analysis
          })),
          ...parsedData.taktikSkills.map(s => ({
            player_id: player.id,
            name: s.name,
            type: 'taktik',
            rating: s.status,
            analysis: s.analysis
          }))
        ];
        const { error: skillsError } = await supabase.from('skills').insert(skillInserts);
        if (skillsError) throw skillsError;

        // 5. Insert Coach Report
        const { error: coachError } = await supabase.from('coach_reports').insert({
          player_id: player.id,
          report_data: parsedData.coachReport,
          author: 'Yunus Emre Pekel'
        });
        if (coachError) throw coachError;

        // 6. Insert goals
        const goalInserts = parsedData.goalsList.map(g => ({
          player_id: player.id,
          category: g.category,
          title: g.title,
          status: 'active'
        }));
        const { error: goalsError } = await supabase.from('goals').insert(goalInserts);
        if (goalsError) throw goalsError;

        setStatus({ type: 'success', message: `Sporcu "${parsedData.fullName}" başarıyla Supabase veritabanına aktarıldı!` });
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: err.message || 'Veritabanına yazılırken bir hata oluştu.' });
      } finally {
        setLoading(false);
      }
    } else {
      // Local Database (LocalStorage simulation)
      try {
        const db = localDb.get();
        
        if (!db.profiles) db.profiles = [];
        if (!db.genetics) db.genetics = [];
        if (!db.antropometri) db.antropometri = [];
        if (!db.skills) db.skills = [];
        if (!db.coach_reports) db.coach_reports = [];
        if (!db.goals) db.goals = [];

        const newProfile = {
          id: newPlayerId,
          email: `${parsedData.fullName.toLowerCase().replace(/ /g, '')}@atletik.com`,
          password: '0', // Default password is 0
          fullName: parsedData.fullName,
          jerseyNumber: 0,
          role: 'student',
          birthDate: parsedData.kimlik.birthDate,
          category: parsedData.kimlik.category,
          avatarUrl: null
        };

        db.profiles.push(newProfile);

        db.genetics.push({
          playerId: newPlayerId,
          fatherHeight: parsedData.kimlik.fatherHeight,
          motherHeight: parsedData.kimlik.motherHeight,
          note: parsedData.geneticNote
        });

        const newAnthro = parsedData.measurements.map(m => ({
          playerId: newPlayerId,
          date: '2026-07-17',
          metric: m.metric,
          val2025: m.val2025,
          val2026: m.val2026,
          change: m.change,
          comment: m.comment
        }));
        db.antropometri = db.antropometri.concat(newAnthro);

        const newSkills = [
          ...parsedData.teknikSkills.map(s => ({ ...s, playerId: newPlayerId, type: 'teknik' })),
          ...parsedData.taktikSkills.map(s => ({ ...s, playerId: newPlayerId, type: 'taktik' }))
        ];
        db.skills = db.skills.concat(newSkills);

        db.coach_reports.push({
          playerId: newPlayerId,
          report: parsedData.coachReport
        });

        const newGoals = parsedData.goalsList.map(g => ({
          playerId: newPlayerId,
          category: g.category,
          title: g.title,
          status: 'active'
        }));
        db.goals = db.goals.concat(newGoals);

        localDb.set(db);
        
        setStatus({ 
          type: 'success', 
          message: `Sporcu "${parsedData.fullName}" local depolamaya kaydedildi! Öğrenci Giriş: ${newProfile.email} / şifre (forma no): 0` 
        });
      } catch (err) {
        console.error(err);
        setStatus({ type: 'error', message: 'Yerel veritabanına yazma başarısız oldu.' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Excel'den Veri İthalatı</h1>
          <p>Oyuncu gelişim Excel dosyasını seçerek sporcuyu sisteme ekleyin.</p>
        </div>
      </div>

      <div className="grid-1-2">
        {/* Upload card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Dosya Seçin</div>
          </div>
          
          <div style={{
            border: '2px dashed var(--c-border-2)',
            borderRadius: 'var(--r-lg)',
            padding: 'var(--space-8)',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.02)',
            position: 'relative'
          }}>
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            <FileUp size={48} style={{ color: 'var(--c-primary)', marginBottom: 'var(--space-4)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 6 }}>
              {file ? file.name : 'Excel Dosyasını Sürükleyin veya Tıklayın'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>
              Desteklenen formatlar: .xlsx, .xls
            </p>
          </div>

          {status.message && (
            <div style={{
              marginTop: 'var(--space-4)',
              background: status.type === 'success' ? 'rgba(39,174,96,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${status.type === 'success' ? 'rgba(39,174,96,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: status.type === 'success' ? 'var(--c-green)' : 'var(--c-red)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {status.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              {status.message}
            </div>
          )}

          {parsedData && (
            <button 
              className="btn btn-primary" 
              onClick={handleSaveToDatabase}
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-4)', padding: '12px' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />
                  Veritabanına Aktarılıyor...
                </>
              ) : (
                <>
                  <RefreshCw size={16} style={{ marginRight: 8 }} />
                  Verileri Sisteme Kaydet
                </>
              )}
            </button>
          )}
        </div>

        {/* Parsed Preview card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Önizleme</div>
          </div>
          
          {parsedData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--c-primary)', fontWeight: 700 }}>SPORCU ADI</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>{parsedData.fullName}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>Doğum Tarihi</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{parsedData.kimlik.birthDate || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>Kategori</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{parsedData.kimlik.category || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>Baba Boyu</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{parsedData.kimlik.fatherHeight || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>Anne Boyu</span>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{parsedData.kimlik.motherHeight || '—'}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: 'var(--space-3)' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8 }}>Tespit Edilen Veri Sayıları</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ background: 'var(--c-surface-3)', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                    📏 {parsedData.measurements.length} Ölçüm
                  </span>
                  <span style={{ background: 'var(--c-surface-3)', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                    🏀 {parsedData.teknikSkills.length} Teknik
                  </span>
                  <span style={{ background: 'var(--c-surface-3)', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                    🧠 {parsedData.taktikSkills.length} Taktik
                  </span>
                  <span style={{ background: 'var(--c-surface-3)', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem' }}>
                    🎯 {parsedData.goalsList.length} Hedef
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-8)',
              color: 'var(--c-text-3)',
              fontSize: '0.85rem'
            }}>
              Ayrıştırılan verilerin özeti burada görünecektir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

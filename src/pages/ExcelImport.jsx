import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Upload, CheckCircle, AlertTriangle, Loader2, X, 
  FileSpreadsheet, PlayCircle, Copy, Check, Sparkles, Download 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { isSupabaseConfigured, supabase, localDb } from '../lib/supabase';

const CHATGPT_PROMPT_TEMPLATE = `Sen bir basketbol antrenörüne yardım eden uzman bir spor analisti asistanısın. Aşağıda bir antrenörün serbest metin olarak yazdığı sporcu gözlemleri, notlar ve bilgiler yer almaktadır. Bu bilgileri analiz ederek belirtilen JSON formatında çıktı üret.

ÇIKTI KURALLARI:
- Sadece geçerli JSON kodu döndür, başka hiçbir metin ekleme.
- Türkçe karakter kullan (ş, ğ, ü, ö, ı, ç).
- Yalnızca ham verilerde/notlarda bulunan veya bunlardan doğrudan türetilen bilgileri kullan.

JSON FORMATI:
[
  {
    "fullName": "AD SOYAD (büyük harfli)",
    "birthDate": "GG.AA.YYYY",
    "jerseyNumber": 10,
    "category": "U9/U10 veya U11 veya U12 veya U14 (yaşa göre belirle)",
    "position": "1 – Oyun Kurucu veya 2 – Şutör Guard veya 3 – Kısa Forvet veya 4 – Uzun Forvet veya 5 – Pivot",
    "dominantHand": "right veya left",
    "fatherHeight": "182 cm",
    "motherHeight": "165 cm",
    "allergy": "Yok veya belirtilen alerji",
    "geneticNote": "Anne/baba boyuna ve fiziksel yapıya göre büyüme potansiyeli değerlendirmesi",
    "antropometri": {
      "Boy":   { "val2025": 0, "val2026": 0, "comment": "Gelişim yorumu" },
      "Kilo":  { "val2025": 0, "val2026": 0, "comment": "Gelişim yorumu" }
    },
    "skills": [
      {
        "type": "teknik",
        "name": "SPORCUYA ÖZGÜ teknik beceri adı",
        "status": "🟢 veya 🟡 veya 🔴",
        "analysis": "Bu sporcunun bu becerideki durumunu açıklayan 1-2 cümle"
      },
      {
        "type": "taktik",
        "name": "SPORCUYA ÖZGÜ taktik/mental beceri adı",
        "status": "🟢 veya 🟡 veya 🔴",
        "analysis": "Bu sporcunun bu alandaki durumunu açıklayan 1-2 cümle"
      }
    ],
    "coachReport": {
      "Genel Sezon Değerlendirmesi": "Sporcunun sezon genelindeki performans özeti",
      "Teknik ve Oyun Kimliği": "Teknik güçlü/zayıf yanlar ve oyun stili"
    },
    "goals": [
      { "category": "Teknik veya Taktik veya Fiziksel veya Zihinsel", "title": "Spesifik hedef açıklaması" }
    ]
  }
]

⚠️ KRİTİK KURALLAR:

1. **skills — KESİNLİKLE YALNIZCA HAM VERİLERDE BULUNAN BECERİLERİ DAHİL ET**:
   Dosyada/notta bulunmayan veya ham verilerde geçmeyen zorunlu/sabit becerileri (örn. "Skip & Go", "Ball Handling" vb.) EKLEME VEYA TAHMİN ETME!
   Sadece ham verilerde açıkça belirtilen veya antrenörün doğrudan değerlendirdiği becerileri dahil et.

2. **antropometri — DİNAMİK ÖLÇÜMLER**:
   Ham verilerde geçen tüm ölçümleri (Boy, Kilo, Kulaç, Bel, Omuz, Bacak ve varsa Dikey Sıçrama, Depar vb. özel ölçümleri) ekle.

3. **coachReport — DİNAMİK ANTRENÖR RAPORU**:
   Antrenörün notlarındaki tüm özel konuları/başlıkları dinamik olarak başlık-açıklama ikilisi şeklinde ekle.

4. **goals**: Yalnızca ham verilerde geçen gelişim ihtiyaçlarına uygun hedefleri ekle.

---
ANTRENÖR NOTLARI:
(Aşağıya sporcu bilgilerini serbest metin olarak yazın. Format fark etmez — WhatsApp notu, kayıt formu, antrenman gözlemi olabilir.)
---`;


function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
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
        resolve(analyzeParsedData(result));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function analyzeParsedData(sheets) {
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
    if (row[3]) geneticNote = row[3];
  });

  const headerRow = kimlikSheet[0];
  const fullName = headerRow ? headerRow[0]?.toString()?.split('|')[0]?.trim() : 'Bilinmeyen Sporcu';

  const antropometriSheet = sheets['2-Antropometri'] || [];
  const measurements = [];
  for (let i = 1; i < antropometriSheet.length; i++) {
    const row = antropometriSheet[i];
    if (row && row[0]) measurements.push({ metric: row[0], val2025: row[1], val2026: row[2], change: row[3], comment: row[4] });
  }

  const teknikSheet = sheets['3-Teknik_Analiz'] || [];
  const teknikSkills = [];
  if (teknikSheet.length > 0) {
    // Sütun başlığına bakarak doğru index'i bul ("Durum" veya "Seviye" her ikisi de çalışır)
    const teknikHeader = teknikSheet[0] || [];
    const teknikStatusIdx = teknikHeader.findIndex(h =>
      /durum|seviye|status|level/i.test(h?.toString() || '')
    );
    const teknikAnalysisIdx = teknikHeader.findIndex(h =>
      /analiz|değerlendirme|yorum|analysis/i.test(h?.toString() || '')
    );
    for (let i = 1; i < teknikSheet.length; i++) {
      const row = teknikSheet[i];
      if (row && row[0]) {
        teknikSkills.push({
          name: row[0],
          status: teknikStatusIdx >= 0 ? row[teknikStatusIdx] : row[1],
          analysis: teknikAnalysisIdx >= 0 ? row[teknikAnalysisIdx] : row[2]
        });
      }
    }
  }

  const taktikSheet = sheets['4-Taktik_Mental_Fiziksel'] || sheets['4-Taktik_Mental'] || [];
  const taktikSkills = [];
  if (taktikSheet.length > 0) {
    // Sütun başlığına bakarak doğru index'i bul
    const taktikHeader = taktikSheet[0] || [];
    const taktikStatusIdx = taktikHeader.findIndex(h =>
      /durum|seviye|status|level/i.test(h?.toString() || '')
    );
    const taktikAnalysisIdx = taktikHeader.findIndex(h =>
      /analiz|değerlendirme|yorum|analysis/i.test(h?.toString() || '')
    );
    for (let i = 1; i < taktikSheet.length; i++) {
      const row = taktikSheet[i];
      if (row && row[0]) {
        taktikSkills.push({
          name: row[0],
          status: taktikStatusIdx >= 0 ? row[taktikStatusIdx] : row[1],
          analysis: taktikAnalysisIdx >= 0 ? row[taktikAnalysisIdx] : row[2]
        });
      }
    }
  }

  const coachSheet = sheets['5-Coach_Report'] || [];
  const coachReport = {};
  for (let i = 0; i < coachSheet.length; i += 2) {
    const titleRow = coachSheet[i];
    const textRow = coachSheet[i + 1];
    if (titleRow && textRow) coachReport[titleRow[0]] = textRow[0];
  }

  const hedeflerSheet = sheets['6-Takip_Hedefler'] || [];
  const goalsList = [];
  const trackingList = [];
  
  let isGoalsSection = false;
  for (let i = 1; i < hedeflerSheet.length; i++) {
    const row = hedeflerSheet[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = row[0]?.toString()?.trim();
    if (!firstCell) continue;
    
    if (firstCell === 'Alan') {
      isGoalsSection = true;
      continue;
    }
    
    if (isGoalsSection) {
      if (row[0] && row[1]) {
        goalsList.push({ category: row[0]?.toString()?.trim(), title: row[1]?.toString()?.trim() });
      }
    } else {
      if (firstCell && (firstCell.includes('.') || firstCell.includes('-') || !isNaN(Date.parse(firstCell)))) {
        trackingList.push({
          date: row[0]?.toString()?.trim(),
          heightCm: row[1] ? row[1].toString() : '',
          weightKg: row[2] ? row[2].toString() : '',
          kulac: row[3] ? row[3].toString() : '',
          bel: row[4] ? row[4].toString() : '',
          omuz: row[5] ? row[5].toString() : '',
          bacak: row[6] ? row[6].toString() : '',
          note: row[7] ? row[7].toString() : ''
        });
      }
    }
  }

  return { fullName, kimlik, geneticNote, measurements, teknikSkills, taktikSkills, coachReport, goalsList, trackingList };
}

function sanitizeAndHydrate(player) {
  const defaultAnthro = ['Boy', 'Kilo', 'Kulaç', 'Bel', 'Omuz', 'Bacak'];
  
  const kimlik = {
    birthDate: player.kimlik?.birthDate || player.birthDate || '01.01.2016',
    category: player.kimlik?.category || player.category || 'U9/U10',
    fatherHeight: player.kimlik?.fatherHeight || player.fatherHeight || '—',
    motherHeight: player.kimlik?.motherHeight || player.motherHeight || '—',
    targetHeight: player.kimlik?.targetHeight || player.targetHeight || '—',
    allergy: player.kimlik?.allergy || player.allergy || 'Yok',
  };

  // Build measurements
  let measurements = [];
  if (Array.isArray(player.measurements)) {
    measurements = [...player.measurements];
  } else if (player.antropometri) {
    Object.keys(player.antropometri).forEach(metric => {
      const item = player.antropometri[metric];
      measurements.push({
        metric,
        val2025: item.val2025 !== undefined ? item.val2025 : '—',
        val2026: item.val2026 !== undefined ? item.val2026 : '—',
        change: item.change !== undefined ? item.change : '—',
        comment: item.comment || ''
      });
    });
  }

  // Ensure default antropometri metrics are present
  defaultAnthro.forEach(metric => {
    if (!measurements.some(m => m.metric?.toLowerCase() === metric.toLowerCase())) {
      measurements.push({
        metric,
        val2025: '—',
        val2026: '—',
        change: '—',
        comment: ''
      });
    }
  });

  // Skills
  let teknikSkills = player.teknikSkills || [];
  let taktikSkills = player.taktikSkills || [];
  if (Array.isArray(player.skills)) {
    player.skills.forEach(s => {
      const sType = s.type?.toLowerCase() || '';
      if (sType === 'teknik') teknikSkills.push(s);
      else if (sType === 'taktik' || sType === 'mental' || sType === 'fiziksel') taktikSkills.push(s);
    });
  }

  // Her sporcunun becerileri kendine özgüdür — varsayılan liste eklenmez.
  // GPT veya Excel'den gelen beceriler olduğu gibi kaydedilir.

  // Coach Report
  const coachReport = player.coachReport || player.coach_reports || {
    'Genel Sezon Değerlendirmesi': '',
    'Teknik ve Oyun Kimliği': '',
    'Liderlik ve Takım Kültürü': '',
    'Mental Profil': '',
    'Gelecek Sezon Beklentisi': ''
  };

  // Goals
  let goalsList = [];
  if (Array.isArray(player.goalsList)) {
    goalsList = player.goalsList;
  } else if (Array.isArray(player.goals)) {
    goalsList = player.goals.map(g => ({ category: g.category || 'Teknik', title: g.title || g.description || '' }));
  }

  // Tracking List
  let trackingList = [];
  if (Array.isArray(player.trackingList)) {
    trackingList = player.trackingList;
  } else if (Array.isArray(player.tracking)) {
    trackingList = player.tracking;
  }

  return {
    fullName: player.fullName || 'Bilinmeyen Sporcu',
    kimlik,
    geneticNote: player.geneticNote || player.geneticsNote || '',
    measurements,
    teknikSkills,
    taktikSkills,
    coachReport,
    goalsList,
    trackingList,
    position: player.position,
    jerseyNumber: player.jerseyNumber,
    dominantHand: player.dominantHand
  };
}

async function saveToDatabase(parsedData) {
  const newPlayerId = Date.now().toString() + Math.random().toString(36).slice(2, 6);

  if (isSupabaseConfigured) {
    const { data: player, error: playerError } = await supabase
      .from('profiles')
      .insert({ id: newPlayerId, full_name: parsedData.fullName, role: 'student', birth_date: parsedData.kimlik.birthDate, position: parsedData.position || '1 (Oyun Kurucu)', category: parsedData.kimlik.category, dominant_hand: parsedData.dominantHand || 'right', bio: '', jersey_number: parsedData.jerseyNumber || 0, status: 'active' })
      .select().single();
    if (playerError) throw playerError;

    const { error: genError } = await supabase.from('genetics').insert({ player_id: player.id, father_height: parseFloat(parsedData.kimlik.fatherHeight) || 0, mother_height: parseFloat(parsedData.kimlik.motherHeight) || 0, genetics_note: parsedData.geneticNote });
    if (genError) throw genError;

    const anthroInserts = parsedData.measurements.map(m => ({ player_id: player.id, metric: m.metric, val_2025: m.val2025?.toString(), val_2026: m.val2026?.toString(), change_val: m.change, comment: m.comment }));
    if (anthroInserts.length) { const { error } = await supabase.from('antropometri').insert(anthroInserts); if (error) throw error; }

    const skillInserts = [
      ...parsedData.teknikSkills.map(s => ({ player_id: player.id, name: s.name, type: 'teknik', rating: s.status, analysis: s.analysis })),
      ...parsedData.taktikSkills.map(s => ({ player_id: player.id, name: s.name, type: 'taktik', rating: s.status, analysis: s.analysis }))
    ];
    if (skillInserts.length) { const { error } = await supabase.from('skills').insert(skillInserts); if (error) throw error; }

    const { error: coachError } = await supabase.from('coach_reports').insert({ player_id: player.id, report_data: parsedData.coachReport, author: 'Yunus Emre Pekel' });
    if (coachError) throw coachError;

    const goalInserts = parsedData.goalsList.map(g => ({ player_id: player.id, category: g.category, title: g.title, status: 'active' }));
    if (goalInserts.length) { const { error } = await supabase.from('goals').insert(goalInserts); if (error) throw error; }

  } else {
    const db = localDb.get();
    if (!db.profiles) db.profiles = [];
    if (!db.genetics) db.genetics = [];
    if (!db.antropometri) db.antropometri = [];
    if (!db.skills) db.skills = [];
    if (!db.coach_reports) db.coach_reports = [];
    if (!db.goals) db.goals = [];
    if (!db.physicalMeasurements) db.physicalMeasurements = [];

    const email = `${parsedData.fullName.toLowerCase().replace(/\s+/g, '')}@atletik.com`;
    
    // Remove if player already exists to prevent duplicate profiles during imports
    db.profiles = db.profiles.filter(p => p.fullName?.toLowerCase() !== parsedData.fullName?.toLowerCase());
    
    db.profiles.push({ id: newPlayerId, email, password: '10', fullName: parsedData.fullName, jerseyNumber: parsedData.jerseyNumber || 10, role: 'student', birthDate: parsedData.kimlik.birthDate, category: parsedData.kimlik.category, avatarUrl: null, status: 'active', position: parsedData.position || '1 – Oyun Kurucu', dominantHand: parsedData.dominantHand || 'right' });
    db.genetics.push({ playerId: newPlayerId, fatherHeight: parsedData.kimlik.fatherHeight, motherHeight: parsedData.kimlik.motherHeight, targetHeight: parsedData.kimlik.targetHeight, note: parsedData.geneticNote, allergy: parsedData.kimlik.allergy });
    db.antropometri = db.antropometri.concat(parsedData.measurements.map(m => ({ playerId: newPlayerId, date: new Date().toISOString().slice(0, 10), ...m })));
    db.skills = db.skills.concat([
      ...parsedData.teknikSkills.map(s => ({ ...s, playerId: newPlayerId, type: 'teknik' })),
      ...parsedData.taktikSkills.map(s => ({ ...s, playerId: newPlayerId, type: 'taktik' }))
    ]);
    db.coach_reports.push({ playerId: newPlayerId, report: parsedData.coachReport });
    db.goals = db.goals.concat(parsedData.goalsList.map(g => ({ playerId: newPlayerId, ...g, status: 'active' })));
    
    // Save physical tracking history
    db.physicalMeasurements = db.physicalMeasurements.concat(parsedData.trackingList.map(t => ({ playerId: newPlayerId, ...t })));
    
    localDb.set(db);
  }
}

const STATUS = { WAITING: 'waiting', PARSING: 'parsing', SAVING: 'saving', DONE: 'done', ERROR: 'error' };

export default function ExcelImport() {
  const location = useLocation();
  const inputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'excel'); // 'excel' | 'gpt'
  const [fileList, setFileList] = useState([]); // [{file, name, status, error, parsed}]
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // GPT Wizard States
  const [gptJson, setGptJson] = useState('');
  const [gptStatus, setGptStatus] = useState({ type: '', message: '' }); // type: 'success' | 'error' | 'loading' | ''
  const [copied, setCopied] = useState(false);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 1-Kimlik_Genetik
    const ws1Data = [
      ['Çınar Caner | Kocaeli Atletik Spor Kulübü'],
      [],
      ['Doğum Tarihi', '13.10.2017'],
      ['Kategori', 'U9/U10'],
      ['Baba Boyu', '182 cm'],
      ['Anne Boyu', '175 cm'],
      ['Tahmini Erişkin Boy', '183.5 ± 8 cm'],
      ['Alerji', 'Var, net tanı bulunmuyor'],
      [],
      ['Genetik & Fiziksel Gelişim Yorumu:', '', '', 'Anne ve baba boy ortalaması yüksek atletik potansiyele işaret etmektedir. Uzun dönem takip önerilir.']
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    XLSX.utils.book_append_sheet(wb, ws1, '1-Kimlik_Genetik');

    // 2-Antropometri
    const ws2Data = [
      ['Ölçüm Kriteri', '2025 Ölçümü', '2026 Ölçümü', 'Değişim', 'Gelişim Yorumu'],
      ['Boy', 133, 135, '+2', 'Normal gelişim, genetik potansiyel yüksektir.'],
      ['Kilo', 27, 30, '+3', 'Boy ile uyumlu artış.'],
      ['Kulaç', '50*', 139, '-', '2025 ölçüm hatası, 2026 referans.'],
      ['Bel', '23*', 65, '-', '2025 ölçüm hatası, 2026 referans.'],
      ['Omuz', '12*', 35, '-', '2025 ölçüm hatası, 2026 referans.'],
      ['Bacak', 75, 82, '+7', 'Olumlu alt ekstremite gelişimi.']
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    XLSX.utils.book_append_sheet(wb, ws2, '2-Antropometri');

    // 3-Teknik_Analiz
    const ws3Data = [
      ['Teknik Beceri', 'Durum (🟢/🟡/🔴)', 'Değerlendirme / Analiz'],
      ['Sol El Gelişimi', '🟡', 'Sezonun ikinci yarısında belirgin gelişim göstermiştir ancak hâlâ ana gelişim alanlarından biridir.'],
      ['Sağ El Bitirişleri', '🟢', 'Sağ el bitiriş repertuvarı sezon boyunca istikrarlı şekilde gelişmiştir.'],
      ['Şut Mekaniği', '🟡', 'Şut mekaniğindeki dirsek açısı üzerine çalışılmaktadır.'],
      ['Top Advance', '🟢', 'Top getirme ve sahayı geçme hızı oldukça yüksektir.'],
      ['Skip & Go', '🟢', 'Bire birlerde yön değiştirme becerisi başarılıdır.'],
      ['Ball Handling', '🟡', 'Özellikle sol el ve yön değiştirmelerde ek bireysel çalışma önerilir.'],
      ['Akselerasyon/Deselerasyon', '🟢', 'Hızlanma ve ani yavaşlamalarda vücut koordinasyonu iyidir.']
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    XLSX.utils.book_append_sheet(wb, ws3, '3-Teknik_Analiz');

    // 4-Taktik_Mental_Fiziksel
    const ws4Data = [
      ['Taktik / Mental / Fiziksel', 'Durum (🟢/🟡/🔴)', 'Değerlendirme / Analiz'],
      ['Basketbol IQ', '🟢', 'Oyun görüşü ve saha içi karar alma becerisi yaş grubuna göre çok olumludur.'],
      ['Yardım Savunması', '🟢', 'Yardım savunması rotasyonlarında doğru kararlar vermektedir.'],
      ['Liderlik', '🟢', 'Takım arkadaşları üzerindeki etkisi ve saha içi yönlendirmesi olumludur.'],
      ['Mücadele Gücü', '🟢', 'Ribaunt ve savunma mücadelelerinde istekli ve agresiftir.'],
      ['Temaslı Oyun', '🟡', 'Temaslı bitirişlerde kuvvet gelişimi takip edilmelidir.'],
      ['Savunma Kimliği', '🟢', 'Bire bir savunmada topa baskı ve konsantrasyonu yüksektir.']
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
    XLSX.utils.book_append_sheet(wb, ws4, '4-Taktik_Mental_Fiziksel');

    // 5-Coach_Report
    const ws5Data = [
      ['Genel Sezon Değerlendirmesi'],
      ['Çınar Caner, sezon boyunca takımın en istikrarlı gelişim gösteren oyuncularından biri olmuştur.'],
      ['Teknik ve Oyun Kimliği'],
      ['Top getirme ve yönlendirmede başarılıdır.'],
      ['Liderlik ve Takım Kültürü'],
      ['Antrenman disiplini yüksek, arkadaşlarıyla uyumlu bir lider karakterdir.'],
      ['Mental Profil'],
      ['Maç konsantrasyonu yüksektir.'],
      ['Gelecek Sezon Beklentisi'],
      ['U12 kategorisinde lider oyun kurucu rolünü üstlenmesi hedeflenmektedir.']
    ];
    const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
    XLSX.utils.book_append_sheet(wb, ws5, '5-Coach_Report');

    // 6-Takip_Hedefler
    const ws6Data = [
      ['Tarih', 'Boy (cm)', 'Kilo (kg)', 'Kulaç (cm)', 'Bel (cm)', 'Omuz (cm)', 'Bacak (cm)', 'Takip Notu'],
      ['17.07.2025', 133, 27, 135, 62, 33, 78, 'Ölçüm yapıldı.'],
      ['17.07.2026', 135, 30, 139, 65, 35, 82, 'Ölçüm yapıldı.'],
      [],
      ['Alan', 'Hedef Açıklaması'],
      ['Teknik', 'Sol el top sürüşü ve bitiriş profesyonelliğini artırmak'],
      ['Zihinsel', 'Baskı altında pas tercihlerini geliştirmek']
    ];
    const ws6 = XLSX.utils.aoa_to_sheet(ws6Data);
    XLSX.utils.book_append_sheet(wb, ws6, '6-Takip_Hedefler');

    XLSX.writeFile(wb, 'atletik_sporcu_sablonu.xlsx');
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(CHATGPT_PROMPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGptImport = async () => {
    if (!gptJson.trim()) {
      setGptStatus({ type: 'error', message: 'Lütfen ChatGPT\'den aldığınız JSON verisini yapıştırın.' });
      return;
    }

    setGptStatus({ type: 'loading', message: 'Veriler ayrıştırılıyor ve kaydediliyor...' });

    try {
      // Find JSON block if ChatGPT wrapped it in markdown code fences
      let jsonText = gptJson.trim();
      if (jsonText.includes('```')) {
        const matches = jsonText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
        if (matches && matches[1]) {
          jsonText = matches[1].trim();
        }
      }

      let parsed = JSON.parse(jsonText);
      
      // If it is a single object, convert to array
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }

      if (parsed.length === 0) {
        setGptStatus({ type: 'error', message: 'Yapıştırılan veri boş bir dizi içeriyor.' });
        return;
      }

      let importedCount = 0;
      for (const rawPlayer of parsed) {
        const hydrated = sanitizeAndHydrate(rawPlayer);
        await saveToDatabase(hydrated);
        importedCount++;
      }

      setGptStatus({
        type: 'success',
        message: `Başarılı! ${importedCount} sporcu başarıyla sisteme aktarıldı.`
      });
      setGptJson('');
    } catch (err) {
      console.error(err);
      setGptStatus({
        type: 'error',
        message: 'Hata: Geçersiz JSON formatı. Lütfen ChatGPT çıktısının geçerli bir JSON olduğundan emin olun. Detay: ' + err.message
      });
    }
  };

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles).filter(f => f.name.match(/\.xlsx?$/i));
    if (!arr.length) return;
    setFileList(prev => {
      const existingNames = new Set(prev.map(x => x.name));
      const toAdd = arr.filter(f => !existingNames.has(f.name)).map(f => ({ file: f, name: f.name, status: STATUS.WAITING, error: null, parsed: null }));
      return [...prev, ...toAdd];
    });
  };

  const removeFile = (name) => setFileList(prev => prev.filter(f => f.name !== name));
  const clearAll = () => { setFileList([]); if (inputRef.current) inputRef.current.value = ''; };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const updateFile = (name, patch) => {
    setFileList(prev => prev.map(f => f.name === name ? { ...f, ...patch } : f));
  };

  const handleStartUpload = async () => {
    const waiting = fileList.filter(f => f.status === STATUS.WAITING || f.status === STATUS.ERROR);
    if (!waiting.length) return;
    setRunning(true);

    for (const item of waiting) {
      // 1. Parse
      updateFile(item.name, { status: STATUS.PARSING, error: null });
      let parsed;
      try {
        parsed = await parseExcelFile(item.file);
        updateFile(item.name, { status: STATUS.SAVING, parsed });
      } catch (err) {
        updateFile(item.name, { status: STATUS.ERROR, error: 'Excel okunamadı: ' + (err.message || 'Bilinmeyen hata') });
        continue;
      }

      // 2. Save
      try {
        await saveToDatabase(parsed);
        updateFile(item.name, { status: STATUS.DONE });
      } catch (err) {
        updateFile(item.name, { status: STATUS.ERROR, error: 'Kayıt hatası: ' + (err.message || 'Bilinmeyen hata') });
      }
    }

    setRunning(false);
  };

  const doneCount = fileList.filter(f => f.status === STATUS.DONE).length;
  const errorCount = fileList.filter(f => f.status === STATUS.ERROR).length;
  const waitingCount = fileList.filter(f => f.status === STATUS.WAITING).length;
  const activeCount = fileList.filter(f => f.status === STATUS.PARSING || f.status === STATUS.SAVING).length;

  const statusIcon = (status) => {
    if (status === STATUS.DONE) return <CheckCircle size={16} style={{ color: 'var(--c-green)', flexShrink: 0 }} />;
    if (status === STATUS.ERROR) return <AlertTriangle size={16} style={{ color: 'var(--c-red)', flexShrink: 0 }} />;
    if (status === STATUS.PARSING || status === STATUS.SAVING) return <Loader2 size={16} className="animate-spin" style={{ color: 'var(--c-primary)', flexShrink: 0 }} />;
    return <FileSpreadsheet size={16} style={{ color: 'var(--c-text-3)', flexShrink: 0 }} />;
  };

  const statusLabel = (item) => {
    if (item.status === STATUS.DONE) return <span style={{ fontSize: '0.7rem', color: 'var(--c-green)' }}>✓ {item.parsed?.fullName || 'Tamamlandı'}</span>;
    if (item.status === STATUS.ERROR) return <span style={{ fontSize: '0.7rem', color: 'var(--c-red)' }}>{item.error}</span>;
    if (item.status === STATUS.PARSING) return <span style={{ fontSize: '0.7rem', color: 'var(--c-primary)' }}>Okunuyor...</span>;
    if (item.status === STATUS.SAVING) return <span style={{ fontSize: '0.7rem', color: 'var(--c-primary)' }}>Kaydediliyor...</span>;
    return <span style={{ fontSize: '0.7rem', color: 'var(--c-text-3)' }}>Bekliyor</span>;
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Veri Aktarım Merkezi</h1>
          <p>Excel dosyalarını yükleyin veya ChatGPT kullanarak düz metin listelerinizi anında içe aktarın.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'var(--c-surface-2)',
        borderRadius: 'var(--r-lg)',
        padding: 4,
        marginBottom: 'var(--space-6)',
        border: '1px solid var(--c-border-2)'
      }}>
        <button
          onClick={() => setActiveTab('excel')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 'var(--r-md)',
            border: 'none',
            background: activeTab === 'excel' ? 'var(--c-primary)' : 'transparent',
            color: activeTab === 'excel' ? '#fff' : 'var(--c-text-3)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <FileSpreadsheet size={16} /> Excel Dosyası Yükle
        </button>
        <button
          onClick={() => setActiveTab('gpt')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 'var(--r-md)',
            border: 'none',
            background: activeTab === 'gpt' ? 'var(--c-primary)' : 'transparent',
            color: activeTab === 'gpt' ? '#fff' : 'var(--c-text-3)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <Sparkles size={16} /> ChatGPT Hızlı Aktarım
        </button>
      </div>

      {activeTab === 'excel' ? (
        <div>
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !running && inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--c-primary)' : 'var(--c-border-2)'}`,
              borderRadius: 'var(--r-lg)',
              padding: 'var(--space-8)',
              textAlign: 'center',
              cursor: running ? 'not-allowed' : 'pointer',
              background: dragOver ? 'rgba(255,107,53,0.05)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
              marginBottom: 'var(--space-5)',
              position: 'relative'
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={e => addFiles(e.target.files)}
              style={{ display: 'none' }}
              disabled={running}
            />
            <Upload size={40} style={{ color: dragOver ? 'var(--c-primary)' : 'var(--c-text-3)', marginBottom: 12, transition: 'color 0.2s' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 6, color: '#fff' }}>
              Excel Dosyalarını Sürükleyin veya Tıklayın
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--c-text-3)' }}>
              Birden fazla .xlsx veya .xls dosyası seçebilirsiniz
            </p>
          </div>

          {/* File List */}
          {fileList.length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{fileList.length} Dosya</span>
                  {doneCount > 0 && <span style={{ fontSize: '0.75rem', background: 'rgba(39,174,96,0.15)', color: 'var(--c-green)', padding: '2px 8px', borderRadius: 20 }}>✓ {doneCount} Tamamlandı</span>}
                  {errorCount > 0 && <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)', color: 'var(--c-red)', padding: '2px 8px', borderRadius: 20 }}>✕ {errorCount} Hata</span>}
                  {waitingCount > 0 && <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: 'var(--c-text-2)', padding: '2px 8px', borderRadius: 20 }}>⏳ {waitingCount} Bekliyor</span>}
                </div>
                {!running && (
                  <button className="btn btn-ghost" onClick={clearAll} style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                    Temizle
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {running || doneCount > 0 ? (
                <div style={{ background: 'var(--c-surface-3)', borderRadius: 8, height: 6, marginBottom: 'var(--space-4)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(doneCount / fileList.length) * 100}%`,
                    background: 'linear-gradient(90deg, var(--c-primary), var(--c-accent))',
                    borderRadius: 8,
                    transition: 'width 0.4s ease'
                  }} />
                </div>
              ) : null}

              {/* File rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fileList.map(item => (
                  <div key={item.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--r-md)',
                    background: item.status === STATUS.DONE
                      ? 'rgba(39,174,96,0.07)'
                      : item.status === STATUS.ERROR
                        ? 'rgba(239,68,68,0.07)'
                        : item.status === STATUS.PARSING || item.status === STATUS.SAVING
                          ? 'rgba(255,107,53,0.07)'
                          : 'var(--c-surface-3)',
                    border: `1px solid ${item.status === STATUS.DONE ? 'rgba(39,174,96,0.2)' : item.status === STATUS.ERROR ? 'rgba(239,68,68,0.2)' : 'transparent'}`,
                    transition: 'all 0.3s'
                  }}>
                    {statusIcon(item.status)}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                      {statusLabel(item)}
                    </div>
                    {!running && item.status !== STATUS.PARSING && item.status !== STATUS.SAVING && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(item.name); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-3)', padding: 4, display: 'flex', alignItems: 'center' }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {fileList.length > 0 && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleStartUpload}
                disabled={running || waitingCount === 0 && errorCount === 0}
                style={{ flex: 1, justifyContent: 'center', padding: '13px' }}
              >
                {running ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />
                    {activeCount > 0 ? `İşleniyor... (${doneCount}/${fileList.length})` : 'Yükleniyor...'}
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} style={{ marginRight: 8 }} />
                    {errorCount > 0 && waitingCount === 0
                      ? `Hatalıları Tekrar Dene (${errorCount})`
                      : `${waitingCount + errorCount} Sporcuyu Sisteme Yükle`}
                  </>
                )}
              </button>
              {!running && fileList.length > 0 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => inputRef.current?.click()}
                  style={{ padding: '13px 20px' }}
                >
                  <Upload size={16} style={{ marginRight: 6 }} /> Dosya Ekle
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {fileList.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--c-text-3)', fontSize: '0.85rem' }}>
              <FileSpreadsheet size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p>Henüz dosya eklenmedi.<br />Her sporcu için ayrı bir Excel dosyası hazırlayıp yukarıya sürükleyin.</p>
              <button 
                type="button"
                className="btn btn-secondary btn-sm" 
                onClick={handleDownloadTemplate}
                style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> Örnek Excel Şablonunu İndir
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, marginBottom: 12, color: 'var(--c-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🧠</span> ChatGPT ile Hızlı Aktarma Sihirbazı
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', lineHeight: 1.6, marginBottom: 20 }}>
            WhatsApp notları, kayıt formu, antrenman gözlemleri — ne elde varsa yapıştırın. ChatGPT her sporcunun güçlü/zayıf yönlerine göre <strong>kendine özgü beceri başlıkları</strong> oluşturur ve sisteme aktarır.
          </p>

          {/* Step 1 */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>1</span>
              Aşağıdaki Talimat Şablonunu Kopyalayın
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', marginBottom: 8 }}>
              Bu promptu kopyalayıp <strong>ChatGPT</strong>'ye yapıştırın. Ardından sporcuların bilgilerini ve antrenman notlarınızı altına serbest metin olarak ekleyip gönderin. Format önemli değil.
            </p>
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleCopyPrompt}
                className="btn btn-secondary btn-sm"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  background: 'var(--c-surface-3)',
                  border: '1px solid var(--c-border)',
                  zIndex: 10
                }}
              >
                {copied ? <Check size={12} style={{ color: 'var(--c-green)' }} /> : <Copy size={12} />}
                {copied ? 'Kopyalandı!' : 'Şablonu Kopyala'}
              </button>
              <pre style={{
                background: 'var(--c-surface-3)',
                border: '1px solid var(--c-border-2)',
                borderRadius: 'var(--r-md)',
                padding: '12px 14px',
                paddingTop: 45,
                maxHeight: 150,
                overflowY: 'auto',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                color: 'var(--c-text-2)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {CHATGPT_PROMPT_TEMPLATE}
              </pre>
            </div>
          </div>

          {/* Step 2 & 3 */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 8, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: 'var(--c-primary)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>2</span>
              ChatGPT Çıktısını Buraya Yapıştırın ve Aktarın
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', marginBottom: 8 }}>
              ChatGPT'nin size verdiği JSON kodunu kopyalayıp aşağıdaki alana yapıştırın. Her sporcu için benzersiz beceri başlıkları otomatik sisteme aktarılır.
            </p>
            <textarea
              value={gptJson}
              onChange={e => setGptJson(e.target.value)}
              placeholder={`ChatGPT'nin verdiği JSON çıktısını buraya yapıştırın...\nörn:\n[\n  {\n    "fullName": "Ahmet Yılmaz",\n    "category": "U12"\n  }\n]`}
              style={{
                width: '100%',
                height: 180,
                background: 'var(--c-surface-3)',
                border: '1px solid var(--c-border-2)',
                borderRadius: 'var(--r-md)',
                padding: 12,
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                color: '#fff',
                resize: 'vertical',
                marginBottom: 12
              }}
            />

            {/* Status alerts */}
            {gptStatus.type === 'error' && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--c-red)', borderRadius: 'var(--r-md)', padding: 12, fontSize: '0.8rem', marginBottom: 12
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{gptStatus.message}</span>
              </div>
            )}

            {gptStatus.type === 'success' && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: 'rgba(39, 174, 96, 0.12)', border: '1px solid rgba(39, 174, 96, 0.25)',
                color: 'var(--c-green)', borderRadius: 'var(--r-md)', padding: 12, fontSize: '0.8rem', marginBottom: 12
              }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                <span>{gptStatus.message}</span>
              </div>
            )}

            {gptStatus.type === 'loading' && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center',
                background: 'rgba(255, 107, 53, 0.12)', border: '1px solid rgba(255, 107, 53, 0.25)',
                color: 'var(--c-primary)', borderRadius: 'var(--r-md)', padding: 12, fontSize: '0.8rem', marginBottom: 12
              }}>
                <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />
                <span>{gptStatus.message}</span>
              </div>
            )}

            <button
              onClick={handleGptImport}
              className="btn btn-primary"
              disabled={gptStatus.type === 'loading' || !gptJson.trim()}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '13px',
                fontSize: '0.875rem'
              }}
            >
              {gptStatus.type === 'loading' ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} /> Sporcular Kaydediliyor...
                </>
              ) : (
                <>
                  <PlayCircle size={16} style={{ marginRight: 8 }} /> Sporcuları Sisteme Aktar
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

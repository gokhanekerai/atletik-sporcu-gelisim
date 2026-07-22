import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Users, Printer, RefreshCw } from 'lucide-react';
import { localDb } from '../lib/supabase';

const initials = name => name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?';

const sanitizeTurkish = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\u0219/g, 'ş')
    .replace(/\u0218/g, 'Ş')
    .replace(/\u021B/g, 't')
    .replace(/\u021A/g, 'T');
};

export default function Reports() {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState('individual');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const reportRef = useRef(null);
  const [coachName, setCoachName] = useState(() => localStorage.getItem('reports_coach_name') || 'Basketbol Antrenörü');
  const [coachTitle, setCoachTitle] = useState(() => localStorage.getItem('reports_coach_title') || 'Başantrenör – Kocaeli Atletik Spor Kulübü');

  const db = localDb.get();
  const players = db.profiles || [];

  // Auto-select first player if none selected
  const effectivePlayerId = selectedPlayerId || players[0]?.id?.toString() || '';
  const selectedPlayer = players.find(p => p.id?.toString() === effectivePlayerId);

  // Load player-specific Excel data
  // Load player-specific Excel data - Preserve all custom metrics if available
  const rawAntro = (db.antropometri || []).filter(m => m.playerId?.toString() === effectivePlayerId);
  const defaultMetrics = ['Boy', 'Kilo', 'Kulaç', 'Bel', 'Omuz', 'Bacak'];
  const playerAntro = rawAntro.length > 0 ? rawAntro : defaultMetrics.map(metricName => ({ metric: metricName, val2025: '—', val2026: '—', change: '—', comment: '' }));
  const playerSkills = (db.skills || []).filter(s => (s.playerId || s.player_id)?.toString() === effectivePlayerId);
  const playerGenetics = (db.genetics || []).find(g => (g.playerId || g.player_id)?.toString() === effectivePlayerId);
  const playerCoachReport = (db.coach_reports || []).find(r => (r.playerId || r.player_id)?.toString() === effectivePlayerId);
  const playerGoals = (db.goals || []).filter(g => (g.playerId || g.player_id)?.toString() === effectivePlayerId);
  const playerTracking = (db.physicalMeasurements || []).filter(m => (m.playerId || m.player_id)?.toString() === effectivePlayerId);

  const teknikSkills = playerSkills.filter(s => s.type === 'teknik');
  const allTaktikSkills = playerSkills.filter(s => s.type === 'taktik');
  
  const mentalSkillNames = ['motivasyon', 'odaklanma', 'özgüven', 'ozguven', 'başarısızlıkla baş çıkma', 'basarisizliklabascikma', 'başarısızlıkla başçıkma', 'disiplin'];
  const isMental = (name) => mentalSkillNames.includes(name?.toLowerCase()?.trim());

  const taktikSkills = allTaktikSkills.filter(s => !isMental(s.name));
  const zihinselSkills = allTaktikSkills.filter(s => isMental(s.name));

  // Compute age from birthdate
  const getAge = (birthDate) => {
    if (!birthDate) return '8';
    const birthYear = parseInt(birthDate.split('.')[2]);
    if (isNaN(birthYear)) return '8';
    return new Date().getFullYear() - birthYear;
  };

  // Calculate ratios if boy exists
  const getVal2026 = (metricName) => {
    const val = playerAntro.find(m => m.metric?.toLowerCase() === metricName.toLowerCase())?.val2026;
    return val ? parseFloat(val) : null;
  };

  const boy = getVal2026('Boy') || 135;
  const kulac = getVal2026('Kulaç') || 139;
  const bacak = getVal2026('Bacak') || 82;
  const bel = getVal2026('Bel') || 65;
  const omuz = getVal2026('Omuz') || 35;

  const kulacBoyRatio = (kulac / boy).toFixed(2);
  const bacakBoyRatio = (bacak / boy).toFixed(2);
  const belBoyRatio = (bel / boy).toFixed(2);
  const omuzBoyRatio = (omuz / boy).toFixed(2);

  const getMetricGrowth = (metricName) => {
    const item = playerAntro.find(m => m.metric?.toLowerCase() === metricName.toLowerCase());
    if (!item) return 0;
    const v25 = parseFloat(item.val2025?.toString()?.replace(',', '.'));
    const v26 = parseFloat(item.val2026?.toString()?.replace(',', '.'));
    if (!isNaN(v25) && !isNaN(v26)) {
      return parseFloat((v26 - v25).toFixed(1));
    }
    return 0;
  };

  const boyGrowth = getMetricGrowth('Boy');
  const kiloGrowth = getMetricGrowth('Kilo');

  const getDisplayChange = (m) => {
    if (m.change && m.change !== '—' && m.change !== '-') {
      return m.change;
    }
    if (!m.val2025 || !m.val2026) return '—';
    const str25 = m.val2025.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
    const str26 = m.val2026.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
    const v25 = parseFloat(str25);
    const v26 = parseFloat(str26);
    if (isNaN(v25) || isNaN(v26)) return '—';
    const diff = v26 - v25;
    const unit = m.metric === 'Kilo' ? 'kg' : 'cm';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${parseFloat(diff.toFixed(1))} ${unit}`;
  };

  const generateScientificEvaluation = () => {
    if (!selectedPlayer) return '';
    const firstName = selectedPlayer.fullName?.split(' ')[0] || '';
    
    let evaluation = `${firstName} için `;

    // 1. Boy gelişimi
    if (boyGrowth > 6) {
      evaluation += `yıllık boy uzama hızı oldukça yüksektir (yılda ${boyGrowth} cm). `;
    } else if (boyGrowth > 3) {
      evaluation += `yıllık boy uzama hızı sağlıklı ve ideal bir gelişim düzeyindedir (yılda ${boyGrowth} cm). `;
    } else if (boyGrowth > 0) {
      evaluation += `yıllık boy uzama hızı dengeli gelişim sınırları içerisindedir (yılda ${boyGrowth} cm). `;
    } else {
      evaluation += `boy uzama hızı ve boy gelişimi istikrarlı seyrini sürdürmektedir. `;
    }

    // 2. Kilo gelişimi
    if (kiloGrowth > 5) {
      evaluation += `Kilo artışı (yılda +${kiloGrowth} kg) fiziksel kütle kazanımı açısından belirgindir. `;
    } else if (kiloGrowth > 0) {
      evaluation += `Kilo artışı (yılda +${kiloGrowth} kg) boy uzama hızıyla son derece uyumlu ve dengelidir. `;
    } else {
      evaluation += `Vücut ağırlığı dengeli gelişim düzeyini korumaktadır. `;
    }

    // 3. Kulaç / Boy oranı
    const kRatio = parseFloat(kulacBoyRatio);
    if (kRatio > 1.02) {
      evaluation += `Kulaç/boy oranı (${kulacBoyRatio}) basketbol branşı için üst düzey fiziksel avantaj (pozitif ape indeksi) sunmaktadır. `;
    } else if (kRatio >= 1.00) {
      evaluation += `Kulaç/boy oranı (${kulacBoyRatio}) basketbol için avantajlı bir fiziksel yapıya işaret etmektedir. `;
    } else {
      evaluation += `Kulaç/boy oranı (${kulacBoyRatio}) dengeli ve standart gelişim sınırları içerisindedir. `;
    }

    // 4. Bacak / Boy oranı
    const bRatio = parseFloat(bacakBoyRatio);
    if (bRatio > 0.60) {
      evaluation += `Bacak/boy oranı (${bacakBoyRatio}) yüksek alt ekstremite uzunluğunu göstermekte olup atletik performansı ve hareket genişliğini desteklemektedir. `;
    } else {
      evaluation += `Bacak/boy oranı (${bacakBoyRatio}) dengeli vücut mekaniği ve hareket koordinasyonu sunmaktadır. `;
    }

    // 5. General recommendation
    evaluation += `Düzenli antrenman ve gelişim takibi ile sporcunun mevcut fiziksel potansiyelini en üst düzeye çıkarması desteklenecektir.`;

    return evaluation;
  };

  // Separate strong directions (🟢) and areas to improve (🟡 or 🔴)
  const strongPoints = playerSkills.filter(s => s.status?.includes('🟢')).map(s => s.name);
  const improvementAreas = playerSkills.filter(s => s.status?.includes('🟡') || s.status?.includes('🔴')).map(s => s.name);

  // If empty, supply default mock/placeholder list
  const displayStrong = strongPoints.length > 0 ? strongPoints : ['Basketbol IQ', 'Mücadele Gücü', 'Yardım Savunması', 'Liderlik'];
  const displayImprovement = improvementAreas.length > 0 ? improvementAreas : ['Sol El Gelişimi', 'Şut Mekaniği', 'Ball Handling'];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* SCOPED REPORT STYLES */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Montserrat:wght@400;500;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&subset=latin,latin-ext&display=swap');

        .report-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          box-shadow: 0 24px 80px rgba(0,0,0,.55);
          border-radius: 4px;
          overflow: hidden;
          background: #0b1929;
        }

        .print-page {
          display: contents;
        }

        .report-panel {
          background: #0f2038;
          padding: 20px 18px 50px;
          position: relative;
          overflow: hidden;
          border-right: 1px solid rgba(255,255,255,.05);
          border-bottom: 1px solid rgba(255,255,255,.05);
          color: #fff;
        }

        .report-panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 10px;
          border-bottom: 2px solid #c0392b;
          margin-bottom: 14px;
        }

        .report-panel-num {
          background: #c0392b;
          color: #fff;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 12px;
          flex-shrink: 0;
        }

        .report-panel-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 12px;
          font-weight: 800;
          color: #fff;
          text-transform: uppercase;
          letter-spacing: .07em;
          flex: 1;
        }

        .report-section-label {
          font-size: 9.5px;
          font-weight: 800;
          color: #e74c3c;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin: 12px 0 7px;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .report-section-label::before {
          content: '';
          width: 10px;
          height: 1.5px;
          background: #c0392b;
          border-radius: 2px;
        }

        .report-info-row {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          margin-bottom: 6px;
          font-size: 11px;
        }

        .report-info-lbl {
          color: #94a3b8;
          min-width: 105px;
          font-size: 9.5px;
          flex-shrink: 0;
        }

        .report-info-val {
          color: #fff;
          font-weight: 600;
        }

        .report-box {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 7px;
          padding: 10px 12px;
        }

        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
        }

        .report-table th {
          background: rgba(255,255,255,.06);
          color: #94a3b8;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .07em;
          padding: 5px 8px;
          text-align: left;
        }

        .report-table td {
          padding: 6px 8px;
          border-bottom: 1px solid rgba(255,255,255,.04);
          font-size: 10.5px;
          color: #fff;
          vertical-align: middle;
        }

        .report-dot-g {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #27ae60;
          box-shadow: 0 0 5px #27ae60;
          flex-shrink: 0;
        }

        .report-dot-y {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #f1c40f;
          box-shadow: 0 0 5px #f1c40f;
          flex-shrink: 0;
        }

        .report-skill-row {
          display: grid;
          grid-template-columns: 120px 18px 1fr;
          align-items: start;
          gap: 6px;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }

        .report-skill-row:last-child {
          border-bottom: none;
        }

        .report-skill-name {
          font-size: 10px;
          font-weight: 700;
          color: #fff;
          word-break: break-word;
          overflow-wrap: break-word;
          padding-top: 1px;
        }

        .report-skill-txt {
          font-size: 9.5px;
          color: #94a3b8;
          line-height: 1.4;
          flex: 1;
        }

        .report-pb-wrap {
          margin-bottom: 7px;
        }

        .report-pb-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }

        .report-pb-label {
          font-size: 9.5px;
          color: #94a3b8;
        }

        .report-pb-val {
          font-size: 9.5px;
          font-weight: 700;
        }

        .report-pb {
          height: 4px;
          background: rgba(255,255,255,.07);
          border-radius: 3px;
          overflow: hidden;
        }

        .report-pb-fill {
          height: 100%;
          border-radius: 3px;
        }

        .report-ratio-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
          margin-top: 8px;
        }

        .report-ratio-card {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 7px;
          padding: 8px;
          text-align: center;
        }

        .report-ratio-val {
          font-family: 'Montserrat', sans-serif;
          font-size: 19px;
          font-weight: 900;
          color: #e67e22;
        }

        .report-ratio-lbl {
          font-size: 8.5px;
          color: #94a3b8;
          margin-top: 1px;
        }

        .report-pot-box {
          background: linear-gradient(135deg, rgba(192,57,43,.12), rgba(231,76,60,.05));
          border: 1px solid rgba(192,57,43,.22);
          border-radius: 10px;
          padding: 14px;
          text-align: center;
          margin-top: 10px;
        }

        .report-pot-score {
          font-family: 'Montserrat', sans-serif;
          font-size: 46px;
          font-weight: 900;
          color: #fff;
          line-height: 1;
        }

        .report-pot-score span {
          font-size: 16px;
          color: #94a3b8;
          font-weight: 400;
        }

        .report-pot-bar-wrap {
          height: 7px;
          background: rgba(255,255,255,.08);
          border-radius: 4px;
          overflow: hidden;
          margin: 8px 0 5px;
        }

        .report-pot-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #c0392b, #e67e22);
          border-radius: 4px;
        }

        .report-pot-lbl {
          font-size: 11px;
          font-weight: 700;
          color: #27ae60;
        }

        .report-pot-sub {
          font-size: 9px;
          color: #94a3b8;
          margin-top: 3px;
          line-height: 1.5;
        }

        .report-qm {
          font-family: Georgia, serif;
          font-size: 50px;
          color: rgba(192,57,43,.28);
          line-height: 1;
        }

        .report-c-sec {
          font-size: 10px;
          font-weight: 800;
          color: #c0392b;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin: 10px 0 4px;
        }

        .report-c-txt {
          font-size: 10.5px;
          color: #94a3b8;
          line-height: 1.65;
          margin-bottom: 2px;
        }

        .report-c-sign {
          text-align: center;
          font-family: Georgia, serif;
          font-style: italic;
          color: #e67e22;
          font-size: 18px;
          margin-top: 14px;
        }

        .report-c-sign-sub {
          font-size: 9.5px;
          color: #94a3b8;
          font-style: normal;
          text-align: center;
          margin-top: 2px;
        }

        .report-goal-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,.04);
        }

        .report-goal-row:last-child {
          border-bottom: none;
        }

        .report-goal-icon {
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .report-goal-txt {
          font-size: 10.5px;
          font-weight: 600;
          color: #fff;
        }

        .report-sum-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-bottom: 12px;
        }

        .report-sum-box {
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 7px;
          padding: 10px 11px;
        }

        .report-sum-title {
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .07em;
          margin-bottom: 7px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .report-sum-title.g { color: #27ae60; }
        .report-sum-title.o { color: #e67e22; }

        .report-sum-item {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          margin-bottom: 4px;
          font-size: 9.5px;
          color: #94a3b8;
          line-height: 1.35;
        }

        .report-parent-box {
          background: linear-gradient(135deg, rgba(39,174,96,.07), rgba(39,174,96,.02));
          border: 1px solid rgba(39,174,96,.18);
          border-radius: 9px;
          padding: 13px;
        }

        .report-parent-title {
          font-size: 10.5px;
          font-weight: 700;
          color: #27ae60;
          margin-bottom: 7px;
        }

        .report-parent-txt {
          font-size: 10px;
          color: #94a3b8;
          line-height: 1.65;
        }

        .report-parent-sign {
          font-size: 10px;
          font-weight: 700;
          color: #e74c3c;
          margin-top: 7px;
          text-align: right;
        }

        .report-footer-strip {
          background: rgba(0,0,0,.35);
          border-top: 1px solid rgba(255,255,255,.07);
          padding: 8px 14px;
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .report-footer-fi {
          font-size: 8.5px;
          color: #64748b;
          display: flex;
          gap: 14px;
        }

        .report-footer-fi strong {
          color: #94a3b8;
        }

        .report-hero-panel {
          background: linear-gradient(180deg, rgba(6, 9, 19, 0.45) 0%, rgba(6, 9, 19, 0.95) 100%), url('/login_player_dunk.png') center/cover no-repeat !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 14px 50px;
          position: relative;
          overflow: hidden;
          color: #fff;
          border-right: 1px solid rgba(255,255,255,.05);
          border-bottom: 1px solid rgba(255,255,255,.05);
          font-family: 'Orbitron', 'Montserrat', sans-serif !important;
        }

        .report-hero-badge {
          width: 66px;
          height: 66px;
          background: rgba(255,255,255,.06);
          border: 2.5px solid #c0392b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          margin: 0 auto 5px;
        }

        .report-hero-badge-txt {
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          font-weight: 900;
          color: #c0392b;
          text-align: center;
          line-height: 1.2;
        }

        .report-hero-club-sub {
          font-family: 'Orbitron', sans-serif !important;
          font-size: 8.5px;
          color: #ff6b35 !important;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-bottom: 12px;
          font-weight: 700;
          text-shadow: 0 0 8px rgba(255, 107, 53, 0.4) !important;
        }

        .report-hero-title-h1 {
          font-family: 'Orbitron', sans-serif !important;
          color: #fff !important;
          font-size: 15px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
          text-align: center;
          margin-bottom: 2px;
          text-shadow: 0 0 10px rgba(0, 242, 254, 0.65) !important;
        }

        .report-hero-title-h2 {
          font-family: 'Orbitron', sans-serif !important;
          color: #ff6b35 !important;
          font-size: 30px;
          font-weight: 900;
          text-transform: uppercase;
          text-align: center;
          line-height: 1;
          text-shadow: 0 0 20px rgba(255, 107, 53, 0.9) !important;
        }

        .report-hero-season {
          font-family: 'Orbitron', sans-serif !important;
          font-size: 9px;
          color: #a78bfa !important;
          font-weight: 700 !important;
          letter-spacing: .1em;
          margin-top: 4px;
          margin-bottom: 12px;
          text-shadow: 0 0 8px rgba(167, 139, 250, 0.5) !important;
        }

        .report-hero-img-area {
          width: 170px;
          height: 200px;
          background: linear-gradient(180deg, rgba(192,57,43,.18), rgba(192,57,43,.04));
          border-radius: 10px;
          border: 1.5px solid rgba(192,57,43,.35);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .report-hero-img-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 30%, rgba(192,57,43,.2), transparent 70%);
        }

        .report-hero-img-emoji {
          font-size: 88px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 4px 20px rgba(192,57,43,.5));
        }

        .report-hero-num {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          background: #c0392b;
          color: #fff;
          font-family: 'Montserrat', sans-serif;
          font-size: 18px;
          font-weight: 900;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          box-shadow: 0 4px 14px rgba(192,57,43,.5);
        }

        .report-hero-name {
          text-align: center;
          margin-bottom: 12px;
        }

        .report-hero-name h3 {
          font-family: 'Orbitron', sans-serif !important;
          color: #fff !important;
          font-size: 19px;
          font-weight: 900;
          text-transform: uppercase;
          line-height: 1.1;
          text-shadow: 0 0 12px rgba(255, 255, 255, 0.6) !important;
        }
 
        .report-hero-name p {
          font-family: 'Orbitron', sans-serif !important;
          color: #ff6b35 !important;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .1em;
          margin-top: 3px;
          text-shadow: 0 0 8px rgba(255, 107, 53, 0.4) !important;
        }

        .report-hero-footer-area {
          border-top: 1px solid rgba(255,255,255,.09);
          padding-top: 10px;
          width: 100%;
          text-align: center;
        }

        .report-hero-prep {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 5px;
        }

        .report-hero-prep-icon {
          width: 26px;
          height: 26px;
          background: #c0392b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .report-hero-prep-t p:first-child {
          font-size: 8.5px;
          color: #64748b;
          text-align: left;
        }

        .report-hero-prep-t p:last-child {
          font-size: 10.5px;
          color: #fff;
          font-weight: 700;
          text-align: left;
        }

        .report-hero-ai {
          font-size: 7.5px;
          color: #64748b;
          opacity: .7;
        }

        .report-pnum {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: rgba(255,255,255,.18);
          font-weight: 800;
          letter-spacing: .08em;
        }

        .report-badge {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 9.5px;
          font-weight: 700;
        }

        .report-badge-ok { background: rgba(39,174,96,.18); color: #2ecc71; }
        .report-badge-warn { background: rgba(243,156,18,.18); color: #f1c40f; }
        .report-badge-no { background: rgba(100,116,139,.15); color: #94a3b8; }

        .report-rel-box {
          background: rgba(192,57,43,.07);
          border: 1px solid rgba(192,57,43,.18);
          border-radius: 7px;
          padding: 9px 11px;
          margin-top: 9px;
        }

        .report-rel-title {
          font-size: 9.5px;
          font-weight: 700;
          color: #e74c3c;
          margin-bottom: 3px;
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .report-rel-txt {
          font-size: 9.5px;
          color: #94a3b8;
          line-height: 1.5;
        }

        .report-legend {
          display: flex;
          gap: 12px;
          margin-top: 9px;
          font-size: 8.5px;
          color: #94a3b8;
          align-items: center;
        }

        .report-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 2px;
        }

        /* Responsive Layout for Dashboard view */
        @media (max-width: 1420px) {
          .report-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .report-grid {
            grid-template-columns: 1fr;
          }
        }

        /* PRINT STYLING - Portrait A4 – Çerçeve sayfanın sonuna kadar uzanır */
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 5mm !important;
          }

          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: 'Outfit', 'Montserrat', 'Inter', -apple-system, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }

          .no-print { display: none !important; }

          /* ── Ana kapsayıcı ── */
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #ffffff !important;
            display: block !important;
          }

          /* ── Her sayfa wrapper'ı (2 panel yan yana, 2 dikey kolon) ── */
          .print-page {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            width: 100% !important;
            height: 100vh !important;
            min-height: 100vh !important;
            max-height: 100vh !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 4mm !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
          }

          .report-panel {
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            max-height: 100% !important;
            box-sizing: border-box !important;
            padding: 14px 14px 32px !important;
            border: 1.5px solid #1e293b !important;
            border-radius: 6px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            position: relative !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .report-hero-panel {
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            max-height: 100% !important;
            box-sizing: border-box !important;
            padding: 14px 14px 32px !important;
            border: 1.5px solid #1e293b !important;
            border-radius: 6px !important;
            background: linear-gradient(180deg, rgba(6, 9, 19, 0.45) 0%, rgba(6, 9, 19, 0.95) 100%), url('/login_player_dunk.png') center/cover no-repeat !important;
            color: #ffffff !important;
            position: relative !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .report-panel * {
            font-family: 'Outfit', 'Montserrat', 'Inter', -apple-system, sans-serif !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .report-hero-panel * {
            font-family: 'Orbitron', 'Montserrat', sans-serif !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ══════════════════════════════════════════
             SAYFA NUMARASI – Panelin en altına, ortada
          ══════════════════════════════════════════ */
          .report-pnum {
            position: absolute !important;
            bottom: 7px !important;
            left: 0 !important;
            right: 0 !important;
            text-align: center !important;
            font-size: 7.5pt !important;
            font-weight: 800 !important;
            color: #64748b !important;
            letter-spacing: 0.12em !important;
            transform: none !important;
            z-index: 10 !important;
          }

          /* ══════════════════════════════════════════
             YAZI BOYUTLARI VE ACCENTLER (EKRAN FORMATI)
          ══════════════════════════════════════════ */
          .report-info-row {
            font-size: 7.5pt !important;
            margin-bottom: 4px !important;
            align-items: flex-start !important;
            gap: 5px !important;
          }
          .report-info-lbl {
            font-size: 7.5pt !important;
            color: #64748b !important;
            min-width: 88px !important;
          }
          .report-info-val {
            font-size: 7.5pt !important;
            color: #0f172a !important;
            font-weight: 600 !important;
          }

          /* Bölüm etiketleri: Solunda kırmızı yatay çizgi */
          .report-section-label {
            color: #e74c3c !important;
            font-size: 7.5pt !important;
            font-weight: 800 !important;
            margin-top: 8px !important;
            margin-bottom: 4px !important;
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            border-left: none !important;
            padding-left: 0 !important;
          }
          
          .report-section-label::before {
            display: inline-block !important;
            content: '' !important;
            width: 10px !important;
            height: 1.5px !important;
            background: #c0392b !important;
            border-radius: 2px !important;
          }

          /* ── Kutular ve Kartlar ── */
          .report-box {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 5px !important;
            padding: 6px 8px !important;
          }
          .report-rel-box {
            background: #fff7ed !important;
            border: 1px solid #ffd8a8 !important;
            border-radius: 5px !important;
            padding: 6px 8px !important;
            margin-top: 5px !important;
          }
          .report-rel-title {
            color: #ea580c !important;
            font-weight: 700 !important;
            font-size: 7pt !important;
          }
          .report-rel-txt {
            color: #475569 !important;
            font-size: 7pt !important;
            line-height: 1.3 !important;
          }

          /* ── Beceri satırları ── */
          .report-skill-row {
            grid-template-columns: 85px 42px 1fr !important;
            border-bottom: 1px solid #f1f5f9 !important;
            padding: 3px 0 !important;
            align-items: start !important;
            gap: 4px !important;
          }
          .report-skill-name {
            color: #0f172a !important;
            font-size: 7pt !important;
            font-weight: 700 !important;
            word-break: break-word !important;
            line-height: 1.2 !important;
          }
          .report-skill-txt {
            color: #475569 !important;
            font-size: 6.5pt !important;
            line-height: 1.25 !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
          }

          /* ── Tablolar ── */
          .report-table th {
            background: #f1f5f9 !important;
            color: #475569 !important;
            border-bottom: 1.5px solid #cbd5e1 !important;
            font-weight: 700 !important;
            font-size: 6.5pt !important;
            padding: 3px 2px !important;
            white-space: nowrap !important;
          }
          .report-table td {
            color: #334155 !important;
            border-bottom: 1px solid #f1f5f9 !important;
            font-size: 7pt !important;
            padding: 3px 2px !important;
            word-break: break-word !important;
          }

          /* ── Panel başlığı ── */
          .report-panel-header {
            padding-bottom: 6px !important;
            margin-bottom: 8px !important;
            border-bottom: 2px solid #c0392b !important;
            flex-shrink: 0 !important;
          }
          .report-panel-title {
            color: #0f172a !important;
            font-size: 9pt !important;
            font-weight: 800 !important;
          }
          .report-panel-num {
            background: #c0392b !important;
            color: #ffffff !important;
            font-weight: 900 !important;
            width: 22px !important;
            height: 22px !important;
            font-size: 10px !important;
          }

          /* ── Hero (Kapak) panel elemanları ── */
          .report-hero-panel {
            background: linear-gradient(180deg, rgba(6, 9, 19, 0.45) 0%, rgba(6, 9, 19, 0.95) 100%), url('/login_player_dunk.png') center/cover no-repeat !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-hero-title-h1 {
            color: #ffffff !important;
            font-size: 11pt !important;
            font-weight: 800 !important;
            text-shadow: 0 0 10px rgba(0, 242, 254, 0.65) !important;
            font-family: 'Orbitron', sans-serif !important;
          }
          .report-hero-title-h2 {
            color: #ff6b35 !important;
            font-size: 22pt !important;
            font-weight: 900 !important;
            text-shadow: 0 0 20px rgba(255, 107, 53, 0.9) !important;
            font-family: 'Orbitron', sans-serif !important;
          }
          .report-hero-season {
            color: #a78bfa !important;
            font-size: 8.5pt !important;
            font-weight: 700 !important;
            text-shadow: 0 0 8px rgba(167, 139, 250, 0.5) !important;
            font-family: 'Orbitron', sans-serif !important;
          }
          .report-hero-name h3 {
            color: #ffffff !important;
            font-weight: 900 !important;
            font-size: 14pt !important;
            text-shadow: 0 0 12px rgba(255, 255, 255, 0.6) !important;
            font-family: 'Orbitron', sans-serif !important;
          }
          .report-hero-name p {
            color: #ff6b35 !important;
            font-weight: 700 !important;
            font-size: 8pt !important;
            text-shadow: 0 0 8px rgba(255, 107, 53, 0.4) !important;
            font-family: 'Orbitron', sans-serif !important;
          }
          .report-hero-img-area {
            width: 120px !important;
            height: 145px !important;
            margin-bottom: 7px !important;
            border: 1.5px solid rgba(192,57,43,.35) !important;
          }
          .report-hero-img-emoji { font-size: 58px !important; }
          .report-hero-club-sub {
            color: #ff6b35 !important;
            font-size: 7.5pt !important;
            font-weight: 700 !important;
            text-shadow: 0 0 8px rgba(255, 107, 53, 0.4) !important;
            font-family: 'Orbitron', sans-serif !important;
          }

          /* ── Antrenör raporu (Coach Report) ── */
          .report-c-sec {
            color: #c0392b !important;
            font-weight: 800 !important;
            font-size: 7.5pt !important;
            border-bottom: 1px solid #cbd5e1 !important;
            padding-bottom: 2px !important;
            margin-top: 5px !important;
          }
          .report-c-txt {
            color: #334155 !important;
            font-size: 7pt !important;
            line-height: 1.3 !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 4 !important;
            -webkit-box-orient: vertical !important;
          }
          .report-c-sign {
            color: #e67e22 !important;
            font-size: 13px !important;
            margin-top: 6px !important;
          }
          .report-c-sign-sub {
            color: #64748b !important;
            font-size: 7.5pt !important;
          }
          .report-qm {
            color: #fee2e2 !important;
            font-size: 28px !important;
            line-height: 1 !important;
          }

          /* ── Renkli noktalar → Ekranda görülen solid rozetler ── */
          .report-dot-g {
            background: #27ae60 !important;
            color: #ffffff !important;
            font-size: 5.5pt !important;
            font-weight: 700 !important;
            padding: 1px 3px !important;
            border-radius: 3px !important;
            display: inline-block !important;
            box-shadow: none !important;
            width: auto !important;
            height: auto !important;
          }
          .report-dot-g::after { content: 'güçlü' !important; }
          
          .report-dot-y {
            background: #e67e22 !important;
            color: #ffffff !important;
            font-size: 5.5pt !important;
            font-weight: 700 !important;
            padding: 1px 3px !important;
            border-radius: 3px !important;
            display: inline-block !important;
            box-shadow: none !important;
            width: auto !important;
            height: auto !important;
          }
          .report-dot-y::after { content: 'gelişim' !important; }

          /* ── Oran kartları ── */
          .report-ratio-grid { gap: 5px !important; margin-top: 5px !important; }
          .report-ratio-card {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 5px !important;
            padding: 5px !important;
          }
          .report-ratio-val {
            color: #e67e22 !important;
            font-weight: 800 !important;
            font-size: 13px !important;
          }
          .report-ratio-lbl { color: #64748b !important; font-size: 6.5pt !important; }

          /* ── Potansiyel Skoru ── */
          .report-pot-box {
            background: #fffafb !important;
            border: 1px solid #fee2e2 !important;
            padding: 8px !important;
            margin-top: 5px !important;
          }
          .report-pot-score {
            color: #0f172a !important;
            font-size: 28px !important;
          }
          .report-pot-score span {
            color: #64748b !important;
          }
          .report-pot-lbl {
            color: #27ae60 !important;
            font-size: 8pt !important;
          }
          .report-pot-sub {
            font-size: 6.5pt !important;
            color: #475569 !important;
            line-height: 1.3 !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 3 !important;
            -webkit-box-orient: vertical !important;
          }

          /* ── Hedefler ── */
          .report-goal-txt { font-size: 7.5pt !important; line-height: 1.2 !important; }
          .report-goal-icon { font-size: 10px !important; }

          /* ── Özet (güçlü / gelişim) ── */
          .report-sum-grid { gap: 5px !important; margin-bottom: 6px !important; }
          .report-sum-box {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            padding: 6px 7px !important;
          }
          .report-sum-title { font-size: 7pt !important; margin-bottom: 3px !important; }
          .report-sum-item {
            font-size: 7pt !important;
            margin-bottom: 2px !important;
            line-height: 1.2 !important;
          }

          /* ── Veli mesajı ── */
          .report-parent-box {
            background: #f0fdf4 !important;
            border: 1px solid #bbf7d0 !important;
            padding: 8px !important;
          }
          .report-parent-title {
            color: #27ae60 !important;
            font-size: 8pt !important;
            margin-bottom: 3px !important;
          }
          .report-parent-txt {
            color: #334155 !important;
            font-size: 7pt !important;
            line-height: 1.28 !important;
          }
          .report-parent-sign {
            color: #e74c3c !important;
            font-size: 7pt !important;
            margin-top: 3px !important;
          }

          /* ── Alt bilgi şeridi (son sayfada) ── */
          .report-footer-strip {
            background: #f8fafc !important;
            border-top: 1px solid #e2e8f0 !important;
            padding: 4px 8px !important;
            position: absolute !important;
            bottom: 12px !important;
            left: 0 !important;
            right: 0 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .report-footer-strip * {
            color: #64748b !important;
            font-size: 6pt !important;
          }

          /* ── Progress bar ── */
          .report-pb-wrap { margin-bottom: 4px !important; }
          .report-pb-label, .report-pb-val { font-size: 6.5pt !important; }
          .report-pb { height: 3px !important; }

          /* ── Legend ── */
          .report-legend { font-size: 6.5pt !important; margin-top: 4px !important; }
        }
      `}</style>

      {/* PAGE HEADER */}
      <div className="page-header no-print">
        <div className="page-header-left">
          <h1>{t('nav.reports')}</h1>
          <p>Çınar Caner Raporu formatında, yüksek okunabilirlikli dijital gelişim kartları</p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> {t('common.refresh', 'Yenile')}
          </button>
          <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedPlayer}>
            <Printer size={16} /> Yazdır / PDF Kaydet
          </button>
        </div>
      </div>

      {/* FILTER / TABS */}
      <div className="tabs no-print" style={{ maxWidth: 320, marginBottom: 'var(--space-5)' }}>
        <button className={`tab-btn${reportType === 'individual' ? ' active' : ''}`} onClick={() => setReportType('individual')}>
          <FileText size={14} /> Bireysel Rapor
        </button>
        <button className={`tab-btn${reportType === 'team' ? ' active' : ''}`} onClick={() => setReportType('team')}>
          <Users size={14} /> Tüm Sporcular
        </button>
      </div>

      {/* Individual View */}
      {reportType === 'individual' && (
        <div>
          {/* Player select & Coach name & Coach Title */}
          <div className="filters-bar no-print" style={{ marginBottom: 'var(--space-5)', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-2)' }}>Sporcu Seçin:</label>
              <select style={{ minWidth: 260, margin: 0 }} value={effectivePlayerId} onChange={e => setSelectedPlayerId(e.target.value)}>
                {players.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-2)' }}>Antrenör Adı Soyadı:</label>
              <input 
                type="text" 
                style={{ width: 220, margin: 0 }}
                placeholder="Basketbol Antrenörü"
                value={coachName}
                onChange={e => {
                  setCoachName(e.target.value);
                  localStorage.setItem('reports_coach_name', e.target.value);
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-2)' }}>Antrenör Görevi:</label>
              <input 
                type="text" 
                style={{ width: 280, margin: 0 }}
                placeholder="Başantrenör – Kocaeli Atletik Spor Kulübü"
                value={coachTitle}
                onChange={e => {
                  setCoachTitle(e.target.value);
                  localStorage.setItem('reports_coach_title', e.target.value);
                }}
              />
            </div>
          </div>

          {players.length === 0 && (
            <div className="empty-state no-print">
              <div className="empty-state-icon">📂</div>
              <p>Henüz sporcu eklenmemiş.<br />Lütfen Sporcular sayfasından sporcu ekleyin.</p>
            </div>
          )}

          {selectedPlayer && (
            <div className="report-grid" id="print-area" ref={reportRef}>
              
              {/* PAGE 1: KAPAK (HERO) & KİMLİK / GENETİK / SAĞLIK */}
              <div className="print-page">
                {/* PAGE 1: KAPAK (HERO) */}
                <div className="report-hero-panel">
                <img src="/logo1.jpeg" alt="Kocaeli Atletik" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: '2px solid var(--c-primary)', boxShadow: '0 0 16px rgba(255, 107, 53, 0.8)' }} onError={(e) => {e.target.src = '/logo.jpeg'}} />
                <div className="report-hero-club-sub">Spor Kulübü</div>
                <div className="report-hero-title-h1">Oyuncu Gelişim</div>
                <div className="report-hero-title-h2">RAPORU</div>
                <div className="report-hero-season">2025 – 2026 SEZONU</div>

                <div className="report-hero-img-area" style={{
                  background: selectedPlayer.avatarUrl ? `url(${selectedPlayer.avatarUrl}) center/cover no-repeat` : undefined
                }}>
                  <div className="report-hero-img-bg"></div>
                  {!selectedPlayer.avatarUrl && <div className="report-hero-img-emoji">🏀</div>}
                  <div className="report-hero-num">{selectedPlayer.jerseyNumber || 0}</div>
                </div>

                <div className="report-hero-name">
                  <h3>{selectedPlayer.fullName?.split(' ').slice(0, -1).join(' ') || selectedPlayer.fullName}<br/>{selectedPlayer.fullName?.split(' ').slice(-1)[0]}</h3>
                  <p>Kocaeli Atletik {selectedPlayer.category || 'U9/U10'}</p>
                </div>

                <div className="report-hero-footer-area" style={{ width: '100%', boxSizing: 'border-box', padding: '0 8px' }}>
                  <div className="report-hero-prep" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <img 
                      src="/atleticplus_logo.jpeg" 
                      alt="AtletikPlus" 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        objectFit: 'cover', 
                        border: '1.5px solid rgba(255,107,53,0.4)',
                        boxShadow: '0 0 10px rgba(255,107,53,0.3)',
                        flexShrink: 0
                      }} 
                    />
                    <div className="report-hero-prep-t" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <p style={{ margin: 0, fontSize: '8.5px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>HAZIRLAYAN</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#ffffff', fontWeight: 800, fontFamily: 'Orbitron, sans-serif' }}>{sanitizeTurkish(coachName)}</p>
                      <p style={{ margin: 0, fontSize: '8px', color: '#cbd5e1', fontWeight: 600, marginTop: '2px' }}>{sanitizeTurkish(coachTitle)}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '10.5px', color: '#ff6b35', fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.4, textShadow: '0 0 10px rgba(255, 107, 53, 0.4)', textAlign: 'center', width: '100%', fontFamily: 'Orbitron, sans-serif' }}>
                    AtletikPlus Yapay Zeka Destekli Sporcu Gelişim Bilimsel Analiz Raporu
                  </div>
                </div>
                <div className="report-pnum">01</div>
              </div>

              {/* PAGE 2: KİMLİK / GENETİK / SAĞLIK */}
              <div className="report-panel">
                <div className="report-panel-header">
                  <div className="report-panel-num">1</div>
                  <div className="report-panel-title">Kimlik – Genetik – Sağlık</div>
                  <img src="/logo1.jpeg" alt="ATL" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 8px rgba(255, 107, 53, 0.7)', border: '1px solid rgba(255, 107, 53, 0.4)' }} onError={(e) => {e.target.src = '/logo.jpeg'}} />
                </div>

                <div className="report-section-label">Sporcu Kimlik Bilgileri</div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>👤</span><span className="report-info-lbl">Ad Soyad</span><span className="report-info-val">{selectedPlayer.fullName}</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>🎂</span><span className="report-info-lbl">Doğum Tarihi</span><span className="report-info-val">{selectedPlayer.birthDate || '—'}</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>📅</span><span className="report-info-lbl">Yaş</span><span className="report-info-val">{getAge(selectedPlayer.birthDate)}</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>⚥</span><span className="report-info-lbl">Cinsiyet</span><span className="report-info-val">Erkek</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>📏</span><span className="report-info-lbl">Ölçüm Tarihi</span><span className="report-info-val">2026</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>🏀</span><span className="report-info-lbl">Takım</span><span className="report-info-val">Kocaeli Atletik {selectedPlayer.category || 'U9/U10'}</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>✋</span><span className="report-info-lbl">Dominant El</span><span className="report-info-val">{selectedPlayer.dominantHand === 'left' ? 'Sol' : 'Sağ'}</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>🎯</span><span className="report-info-lbl">Pozisyon</span><span className="report-info-val">{selectedPlayer.position || '1 – Oyun Kurucu'}</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>🏃</span><span className="report-info-lbl">Antrenman Katılım</span><span className="report-info-val">Yüksek</span></div>
                <div className="report-info-row"><span style={{ fontSize: 13 }}>📚</span><span className="report-info-lbl">Akademik Durum</span><span className="report-info-val">Başarılı</span></div>

                <div className="report-section-label">Genetik Bilgiler</div>
                {playerGenetics ? (
                  <div className="report-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 10.5 }}><span style={{ color: '#94a3b8' }}>Baba Boyu</span><span style={{ color: '#fff', fontWeight: 700 }}>{playerGenetics.fatherHeight}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 10.5 }}><span style={{ color: '#94a3b8' }}>Anne Boyu</span><span style={{ color: '#fff', fontWeight: 700 }}>{playerGenetics.motherHeight}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10.5 }}><span style={{ color: '#94a3b8' }}>Hedef Boy (Genetik)</span><span style={{ color: '#e67e22', fontWeight: 700 }}>{playerGenetics.targetHeight}</span></div>
                    <div style={{ fontSize: 9.5, color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 7, fontStyle: 'italic', lineHeight: 1.5 }}>
                      {playerGenetics.note || 'Anne ve baba boy ortalaması yüksek atletik potansiyele işaret etmektedir. Uzun dönem takip önerilir.'}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 10, color: '#64748b' }}>Genetik veri yüklenmemiş</p>
                )}

                <div className="report-section-label">Sağlık Bilgileri</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ fontSize: 10, color: '#94a3b8' }}>Kronik Rahatsızlık</span><span className="report-badge report-badge-no">Yok</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}><span style={{ fontSize: 10, color: '#94a3b8' }}>Alerji</span><span className={`report-badge ${playerGenetics?.allergy && playerGenetics.allergy !== 'Yok' ? 'report-badge-warn' : 'report-badge-no'}`}>{playerGenetics?.allergy || 'Yok'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 10, color: '#94a3b8' }}>Düzenli İlaç Kullanımı</span><span className="report-badge report-badge-no">Yok</span></div>

                <div className="report-rel-box">
                  <div className="report-rel-title">⚠ Veri Güvenirliği</div>
                  <div className="report-rel-txt">2025 kulaç, bel ve omuz ölçümlerinde hata şüphesi vardır; 2026 referans alınmıştır. Yöntem: Standart Antropometrik Ölçüm.</div>
                </div>
                <div className="report-pnum">02</div>
              </div>
            </div>

            {/* PAGE 2: ANTROPOMETRİK DEĞERLENDİRME & TEKNİK ANALİZ */}
            <div className="print-page">
              {/* PAGE 3: ANTROPOMETRİK DEĞERLENDİRME */}
              <div className="report-panel">
                <div className="report-panel-header">
                  <div className="report-panel-num">2</div>
                  <div className="report-panel-title">Antropometrik Değerlendirme</div>
                  <img src="/logo1.jpeg" alt="ATL" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 8px rgba(255, 107, 53, 0.7)', border: '1px solid rgba(255, 107, 53, 0.4)' }} onError={(e) => {e.target.src = '/logo.jpeg'}} />
                </div>

                <div className="report-section-label">Fiziksel Ölçümler</div>
                {playerAntro.length > 0 ? (
                  <table className="report-table">
                    <thead><tr><th>Ölçüm</th><th>2025</th><th>2026</th><th>Değişim</th><th>Bilimsel Yorum</th></tr></thead>
                    <tbody>
                      {playerAntro.map((m, i) => (
                        <tr key={i}>
                          <td>{m.metric === 'Boy' ? '🦴 Boy' : m.metric === 'Kilo' ? '⚖️ Kilo' : m.metric === 'Kulaç' ? '🤲 Kulaç' : m.metric === 'Bel' ? '📐 Bel' : m.metric === 'Omuz' ? '💪 Omuz' : m.metric === 'Bacak' ? '🦵 Bacak' : m.metric}</td>
                          <td style={{ color: '#64748b' }}>{m.val2025} {m.metric === 'Kilo' ? 'kg' : 'cm'}</td>
                          <td style={{ color: '#27ae60', fontWeight: 700 }}>{m.val2026} {m.metric === 'Kilo' ? 'kg' : 'cm'}</td>
                          <td style={{ color: String(getDisplayChange(m)).startsWith('+') ? '#27ae60' : '#64748b', fontWeight: 700 }}>{getDisplayChange(m)}</td>
                          <td style={{ color: '#94a3b8', fontSize: '9px', whiteSpace: 'normal', maxWidth: '140px', lineHeight: '1.2' }}>{m.comment || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: 10, color: '#64748b' }}>Antropometri verisi yüklenmemiş</p>
                )}
                <p style={{ fontSize: 8.5, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>* 2025 ölçüm hatası, 2026 referans.</p>

                <div className="report-section-label">Vücut Oranları (2026)</div>
                <div className="report-ratio-grid">
                  <div className="report-ratio-card"><div className="report-ratio-val">{kulacBoyRatio}</div><div className="report-ratio-lbl">Kulaç / Boy</div></div>
                  <div className="report-ratio-card"><div className="report-ratio-val">{bacakBoyRatio}</div><div className="report-ratio-lbl">Bacak / Boy</div></div>
                  <div className="report-ratio-card"><div className="report-ratio-val">{belBoyRatio}</div><div className="report-ratio-lbl">Bel / Boy</div></div>
                  <div className="report-ratio-card"><div className="report-ratio-val">{omuzBoyRatio}</div><div className="report-ratio-lbl">Omuz / Boy</div></div>
                </div>


                <div className="report-section-label">Bilimsel Değerlendirme</div>
                <div className="report-box" style={{ fontSize: 9.5, color: '#cbd5e1', lineHeight: 1.55 }}>
                  {generateScientificEvaluation()}
                </div>
                <div className="report-pnum">03</div>
              </div>

              {/* PAGE 4: TEKNİK ANALİZ */}
              <div className="report-panel">
                <div className="report-panel-header">
                  <div className="report-panel-num">3</div>
                  <div className="report-panel-title">Teknik Analiz</div>
                  <img src="/logo1.jpeg" alt="ATL" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 8px rgba(255, 107, 53, 0.7)', border: '1px solid rgba(255, 107, 53, 0.4)' }} onError={(e) => {e.target.src = '/logo.jpeg'}} />
                </div>

                <div className="report-section-label">Teknik Beceriler</div>
                {teknikSkills.length > 0 ? (
                  teknikSkills.map((s, i) => (
                    <div key={i} className="report-skill-row">
                      <div className="report-skill-name">{s.name}</div>
                      <div style={{ paddingTop: 3 }}><span className={s.status?.includes('🟢') ? 'report-dot-g' : 'report-dot-y'}></span></div>
                      <div className="report-skill-txt">{s.analysis}</div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 10, color: '#64748b' }}>Teknik analiz verisi yüklenmemiş</p>
                )}

                <div className="report-legend">
                  <span><span className="report-legend-dot" style={{ background: '#27ae60' }}></span> Güçlü Yön</span>
                  <span><span className="report-legend-dot" style={{ background: '#f1c40f' }}></span> Gelişim Alanı</span>
                </div>

                <div className="report-section-label" style={{ marginTop: 14 }}>Görsel Değerlendirme</div>
                {teknikSkills.map((s, i) => {
                  const percent = s.status?.includes('🟢') ? 80 : s.status?.includes('🟡') ? 50 : 30;
                  const color = s.status?.includes('🟢') ? '#27ae60' : '#f1c40f';
                  return (
                    <div key={i} className="report-pb-wrap">
                      <div className="report-pb-head">
                        <span className="report-pb-label">{s.name}</span>
                        <span className="report-pb-val" style={{ color }}>{s.status?.includes('🟢') ? 'Güçlü' : 'Gelişiyor'}</span>
                      </div>
                      <div className="report-pb">
                        <div className="report-pb-fill" style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.1))` }}></div>
                      </div>
                    </div>
                  );
                })}
                <div className="report-pnum">04</div>
              </div>
            </div>

            {/* PAGE 3: TAKTİK & ZİHİNSEL ANALİZ & COACH REPORT */}
            <div className="print-page">
              {/* PAGE 5: TAKTİK, MENTAL & FİZİKSEL ANALİZ */}
              <div className="report-panel">
                <div className="report-panel-header">
                  <div className="report-panel-num">4</div>
                  <div className="report-panel-title">Taktik, Mental & Fiziksel Analiz</div>
                  <img src="/logo1.jpeg" alt="ATL" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 8px rgba(255, 107, 53, 0.7)', border: '1px solid rgba(255, 107, 53, 0.4)' }} onError={(e) => {e.target.src = '/logo.jpeg'}} />
                </div>

                <div className="report-section-label">⚡ Taktik, Mental & Fiziksel Beceriler</div>
                {allTaktikSkills.length > 0 ? (
                  allTaktikSkills.map((s, i) => (
                    <div key={i} className="report-skill-row">
                      <div className="report-skill-name">{s.name}</div>
                      <div style={{ paddingTop: 3 }}>
                        <span className={s.status?.includes('🟢') ? "report-dot-g" : "report-dot-y"}></span>
                      </div>
                      <div className="report-skill-txt">{s.analysis}</div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 10, color: '#64748b' }}>Taktik, mental ve fiziksel analiz verisi yüklenmemiş</p>
                )}

                <div className="report-legend" style={{ marginTop: 20 }}>
                  <span><span className="report-legend-dot" style={{ background: '#27ae60' }}></span> Güçlü Yön</span>
                  <span><span className="report-legend-dot" style={{ background: '#f1c40f' }}></span> Gelişim Alanı</span>
                </div>
                <div className="report-pnum">05</div>
              </div>

              {/* PAGE 6: COACH REPORT */}
              <div className="report-panel">
                <div className="report-panel-header">
                  <div className="report-panel-num">5</div>
                  <div className="report-panel-title">Coach Report</div>
                  <img src="/logo1.jpeg" alt="ATL" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 8px rgba(255, 107, 53, 0.7)', border: '1px solid rgba(255, 107, 53, 0.4)' }} onError={(e) => {e.target.src = '/logo.jpeg'}} />
                </div>

                <div className="report-qm">"</div>
                <div className="report-c-sec">Antrenör Yorumu</div>

                {playerCoachReport?.report ? (
                  Object.entries(playerCoachReport.report)
                    .filter(([k, v]) => k && v && k !== 'undefined')
                    .map(([title, text]) => (
                      <div key={title}>
                        <div className="report-c-sec" style={{ color: '#fff', fontSize: 10 }}>{title}</div>
                        <div className="report-c-txt">{text}</div>
                      </div>
                    ))
                ) : (
                  <p style={{ fontSize: 10, color: '#64748b' }}>Antrenör raporu yüklenmemiş</p>
                )}

                <div className="report-c-sign">{sanitizeTurkish(coachName)}</div>
                <div className="report-c-sign-sub">{sanitizeTurkish(coachTitle)}</div>
                <div className="report-pnum">06</div>
              </div>
            </div>

            {/* PAGE 4: GELİŞİM PLANI & SONUÇ & VELİ MESAJI */}
            <div className="print-page">
              {/* PAGE 7: GELİŞİM PLANI */}
              <div className="report-panel">
                <div className="report-panel-header">
                  <div className="report-panel-num">6</div>
                  <div className="report-panel-title">Gelişim Planı</div>
                  <img src="/logo1.jpeg" alt="ATL" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 8px rgba(255, 107, 53, 0.7)', border: '1px solid rgba(255, 107, 53, 0.4)' }} onError={(e) => {e.target.src = '/logo.jpeg'}} />
                </div>

                <div className="report-section-label">3 Aylık / Sezonluk Gelişim Hedefleri</div>
                {playerGoals.length > 0 ? (
                  <div className="report-box" style={{ marginBottom: 10 }}>
                    {playerGoals.map((g, i) => (
                      <div key={i} className="report-goal-row" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <div className="report-goal-icon" style={{ fontSize: '11px' }}>
                          {g.category === 'Teknik' ? '🏀' : g.category === 'Taktik' ? '🧠' : g.category === 'Mental' ? '🔥' : '💪'}
                        </div>
                        <div className="report-goal-txt" style={{ fontSize: '9.5px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--c-primary)', marginRight: 4 }}>{g.category}:</span> {g.title}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 9, color: '#64748b', marginBottom: 10 }}>Hedef tanımlanmamış.</p>
                )}

                <div className="report-section-label">Çeyreklik Gelişim Takip Tablosu</div>
                {playerTracking.length > 0 ? (
                  <table className="report-table" style={{ fontSize: '8px', width: '100%', marginBottom: 8 }}>
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Boy</th>
                        <th>Kilo</th>
                        <th>Kulaç</th>
                        <th>Bel</th>
                        <th>Omuz</th>
                        <th>Bacak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerTracking.map((t, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 'bold', color: '#fff' }}>{t.date}</td>
                          <td>{(t.heightCm || t.height_cm) ? `${t.heightCm || t.height_cm} cm` : '—'}</td>
                          <td>{(t.weightKg || t.weight_kg) ? `${t.weightKg || t.weight_kg} kg` : '—'}</td>
                          <td>{t.kulac ? `${t.kulac} cm` : '—'}</td>
                          <td>{t.bel ? `${t.bel} cm` : '—'}</td>
                          <td>{t.omuz ? `${t.omuz} cm` : '—'}</td>
                          <td>{t.bacak ? `${t.bacak} cm` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: 9, color: '#64748b', marginBottom: 8 }}>Çeyreklik takip ölçümü bulunmuyor.</p>
                )}

                <div className="report-rel-box" style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#e74c3c', marginBottom: 3 }}>📌 Not</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', lineHeight: 1.4 }}>Bu plan düzenli ölçümler ve gözlemler doğrultusunda güncellenecektir.</div>
                </div>
                <div className="report-pnum">07</div>
              </div>

              {/* PAGE 8: SONUÇ & VELİ MESAJI */}
              <div className="report-panel" style={{ paddingBottom: 62 }}>
                <div className="report-panel-header">
                  <div className="report-panel-num">7</div>
                  <div className="report-panel-title">Sonuç & Veli Mesajı</div>
                  <img src="/logo1.jpeg" alt="ATL" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 0 8px rgba(255, 107, 53, 0.7)', border: '1px solid rgba(255, 107, 53, 0.4)' }} onError={(e) => {e.target.src = '/logo.jpeg'}} />
                </div>

                <div className="report-sum-grid">
                  <div className="report-sum-box">
                    <div className="report-sum-title g">✅ Güçlü Yönler</div>
                    {displayStrong.map((item, idx) => (
                      <div key={idx} className="report-sum-item"><span style={{ color: '#27ae60' }}>●</span> {item}</div>
                    ))}
                  </div>
                  <div className="report-sum-box">
                    <div className="report-sum-title o">⚡ Gelişim Alanları</div>
                    {displayImprovement.map((item, idx) => (
                      <div key={idx} className="report-sum-item"><span style={{ color: '#e67e22' }}>●</span> {item}</div>
                    ))}
                  </div>
                </div>

                <div className="report-parent-box">
                  <div className="report-parent-title">💌 Veli Mesajı</div>
                  <div className="report-parent-txt">
                    Sevgili Velimiz,<br/><br/>
                    {selectedPlayer.fullName}’ın gelişimi bizler için çok kıymetlidir. Bu rapor, çocuğunuzun mevcut durumunu, güçlü yönlerini ve gelişim alanlarını objektif verilerle ortaya koymak için hazırlanmıştır.<br/><br/>
                    Birlikte çalışarak onun potansiyelini en üst seviyeye taşıyacağız. Desteğiniz ve güveniniz için teşekkür ederiz.
                  </div>
                  <div className="report-parent-sign">Kocaeli Atletik Spor Kulübü</div>
                </div>

                <div className="report-footer-strip">
                  <div className="report-footer-fi">
                    <span><strong>Ölçüm:</strong> 2026</span>
                    <span><strong>Sonraki Ölçüm:</strong> Ekim 2026</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#64748b' }}>🤖 Dijital Raporlama: ChatGPT (OpenAI)</div>
                </div>
                <div className="report-pnum" style={{ bottom: '34px' }}>08</div>
              </div>
            </div>

          </div>
          )}
        </div>
      )}

      {/* Team / All Players List */}
      {reportType === 'team' && (
        <div className="no-print">
          {players.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p>Henüz sporcu eklenmemiş.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {players.filter(p => p.role === 'student').map(p => {
                const antro = (db.antropometri || []).filter(m => m.playerId?.toString() === p.id?.toString());
                const skills = (db.skills || []).filter(s => s.playerId?.toString() === p.id?.toString());
                const goals = (db.goals || []).filter(g => g.playerId?.toString() === p.id?.toString());
                return (
                  <div key={p.id} className="card">
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="avatar" style={{ 
                        boxShadow: 'var(--shadow-orange)', 
                        flexShrink: 0,
                        overflow: 'hidden',
                        background: p.avatarUrl ? `url(${p.avatarUrl}) center/cover no-repeat` : undefined
                      }}>
                        {!p.avatarUrl && initials(p.fullName)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>{p.fullName}</div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--c-text-3)' }}>
                          {p.category && <span>📌 {p.category}</span>}
                          {p.birthDate && <span>🎂 {p.birthDate}</span>}
                          <span>📏 {antro.length} ölçüm</span>
                          <span>🏀 {skills.filter(s => s.type === 'teknik').length} teknik</span>
                          <span>🧠 {skills.filter(s => s.type === 'taktik').length} taktik</span>
                          <span>🎯 {goals.length} hedef</span>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedPlayerId(p.id?.toString()); setReportType('individual'); }} className="btn btn-ghost btn-sm">Rapora Git →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

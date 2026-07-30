const XLSX = require('xlsx');
const path = require('path');

// Test "Durum" column header (like in the user's photo)
// Simulate an Excel sheet with "Durum" header and 11 rows
const mockSheetDurum = [
  ['Teknik Alan', 'Durum', 'Analiz'],
  ['Top Hâkimiyeti', '🟢', 'Tam sahada top kontrolü güçlü yönlerinden biridir.'],
  ['Şut Mekaniği', '🟢', 'Topa yeterli yükseklik kazandırabilmektedir.'],
  ['Dar Alan Dribling', '🟡', 'Dar alanda yön değiştirebilmektedir.'],
  ['Sağ Over Layup', '🟢', 'Sağ taraftan over hand layup isabeti yüksektir.'],
  ['Sağ Under Layup', '🟡', 'Under layup bitirişlerde tekrar sayısı artmalıdır.'],
  ['Sol Taraf Bitiriş', '🟡', 'Sol tarafta çoğunlukla sağ elini kullanmaktadır.'],
  ['İniş Tekniği', '🟡', 'Turnikelerde çift zamanlı iniş eğilimi göstermektedir.'],
  ['Temaslı Bitiriş', '🟡', 'Temastan kaçınmamakla birlikte tercihler gelişmeli.'],
  ['Pas ve Advance', '🟡', 'Topu son noktaya kadar taşıyıp anında pas verebilmektedir.'],
  ['Topsuz Oyun', '🟡', 'Yarı sahada topsuz hareket ve doğru alan kullanımı gelişimde.'],
];

function parseSheetWithHeaderDetection(sheet) {
  const skills = [];
  if (sheet.length > 0) {
    const header = sheet[0] || [];
    const statusIdx = header.findIndex(h =>
      /durum|seviye|status|level/i.test(h?.toString() || '')
    );
    const analysisIdx = header.findIndex(h =>
      /analiz|değerlendirme|yorum|analysis/i.test(h?.toString() || '')
    );
    console.log('Header:', header);
    console.log(`Status column index: ${statusIdx} → "${header[statusIdx]}"`);
    console.log(`Analysis column index: ${analysisIdx} → "${header[analysisIdx]}"`);
    for (let i = 1; i < sheet.length; i++) {
      const row = sheet[i];
      if (row && row[0]) {
        skills.push({
          name: row[0],
          status: statusIdx >= 0 ? row[statusIdx] : row[1],
          analysis: analysisIdx >= 0 ? row[analysisIdx] : row[2]
        });
      }
    }
  }
  return skills;
}

console.log('\n=== TEST: "Durum" sütun başlıklı Excel (fotoğraftaki gibi 10 satır) ===');
const teknikWithDurum = parseSheetWithHeaderDetection(mockSheetDurum);
console.log('\n✅ Okunan Skills (', teknikWithDurum.length, 'adet):');
teknikWithDurum.forEach((s, i) => console.log(`  ${i+1}. [${s.status}] ${s.name}`));

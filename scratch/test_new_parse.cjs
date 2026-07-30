const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Cinar_Caner (2).xlsx');
const workbook = XLSX.readFile(filePath);

// Simulate the new parsing logic
function parseSheetWithHeaderDetection(sheetName, sheets) {
  const sheet = sheets[sheetName] || [];
  const skills = [];
  if (sheet.length > 0) {
    const header = sheet[0] || [];
    const statusIdx = header.findIndex(h =>
      /durum|seviye|status|level/i.test(h?.toString() || '')
    );
    const analysisIdx = header.findIndex(h =>
      /analiz|değerlendirme|yorum|analysis/i.test(h?.toString() || '')
    );
    console.log(`\n[${sheetName}] Header:`, header);
    console.log(`  Status column: index ${statusIdx} = "${header[statusIdx]}"`);
    console.log(`  Analysis column: index ${analysisIdx} = "${header[analysisIdx]}"`);
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

const result = {};
workbook.SheetNames.forEach(name => {
  result[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 });
});

const teknik = parseSheetWithHeaderDetection('3-Teknik_Analiz', result);
const taktik = parseSheetWithHeaderDetection('4-Taktik_Mental_Fiziksel', result);

console.log('\n✅ Teknik Skills (', teknik.length, 'adet):');
teknik.forEach((s, i) => console.log(`  ${i+1}. [${s.status || '?'}] ${s.name}`));

console.log('\n✅ Taktik Skills (', taktik.length, 'adet):');
taktik.forEach((s, i) => console.log(`  ${i+1}. [${s.status || '?'}] ${s.name}`));

console.log('\n⚠️ Toplam skill:', teknik.length + taktik.length, '(Varsayılan eklenmez — sadece Excel\'deki satırlar)');

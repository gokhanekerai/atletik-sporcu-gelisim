const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Cinar_Caner (2).xlsx');
const workbook = XLSX.readFile(filePath);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} (Rows: ${data.length}) ---`);
  data.slice(0, 15).forEach((row, i) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
  });
});

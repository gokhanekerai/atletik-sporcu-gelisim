const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Cinar_Caner (2).xlsx');
const workbook = XLSX.readFile(filePath);

const sheetName = '3-Teknik_Analiz';
const sheet = workbook.Sheets[sheetName];

if (!sheet) {
  console.log(`Sheet "${sheetName}" not found!`);
  console.log('Available sheets:', workbook.SheetNames);
} else {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`Sheet "${sheetName}" rows count:`, data.length);
  data.forEach((row, index) => {
    console.log(`Row ${index}:`, JSON.stringify(row));
  });
}

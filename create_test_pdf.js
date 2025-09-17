import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test-portfolio.pdf'));

doc.fontSize(16).text('Beratungsdepot', 50, 50);
doc.fontSize(12).text('Stand: 16.01.2025', 50, 80);

doc.text('', 50, 120);
doc.text('Positionen:', 50, 120);
doc.text('', 50, 140);

doc.text('Apple Inc. ISIN: US0378331005 Wert: 150.000,00 EUR', 50, 160);
doc.text('BMW AG ISIN: DE0005190003 Betrag: 75.000,00 EUR', 50, 180);
doc.text('iShares Core MSCI World ISIN: IE00B4L5Y983 Wert: 250.000,00 EUR', 50, 200);
doc.text('Deka-Immobilien Europa WKN: 980956 Betrag: 100.000,00 EUR', 50, 220);
doc.text('Gold ETC Physical ISIN: DE000A0S9GB0 Marktwert: 50.000,00 EUR', 50, 240);

doc.end();

console.log('Test-PDF erstellt: test-portfolio.pdf');
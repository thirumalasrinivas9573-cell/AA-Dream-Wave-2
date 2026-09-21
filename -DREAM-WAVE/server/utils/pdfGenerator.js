const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

const C = {
  primary: '#0d9488',
  dark: '#0c1222',
  muted: '#64748b',
  light: '#f0fdfa',
  white: '#ffffff',
  accent: '#06b6d4',
};

function generatePDF(reportData, fileName) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(REPORTS_DIR, fileName);
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.dark);
    doc.rect(0, 0, doc.page.width, 8).fill(C.primary);
    doc.fontSize(28).fillColor(C.white).font('Helvetica-Bold')
      .text('Dream Wave AI', 50, 120, { align: 'center' });
    doc.fontSize(14).fillColor(C.accent)
      .text('Performance & Growth Report', 50, 160, { align: 'center' });
    doc.roundedRect(80, 220, doc.page.width - 160, 70, 10).fill(C.primary);
    doc.fontSize(20).fillColor(C.white).font('Helvetica-Bold')
      .text(reportData.title || reportData.career || 'Report', 80, 245, {
        width: doc.page.width - 160,
        align: 'center',
      });
    doc.fontSize(11).fillColor('#99f6e4').font('Helvetica')
      .text(`Prepared for: ${reportData.userName || 'User'}`, 50, 340, { align: 'center' })
      .text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, 358, { align: 'center' });

    doc.addPage();
    let n = 1;
    for (const section of reportData.sections || []) {
      if (doc.y > doc.page.height - 120) doc.addPage();
      doc.rect(50, doc.y, doc.page.width - 100, 28).fill(C.primary);
      doc.fontSize(12).fillColor(C.white).font('Helvetica-Bold')
        .text(`${n}. ${section.title}`, 62, doc.y - 22);
      doc.moveDown(0.4);
      n += 1;
      doc.fontSize(10.5).fillColor(C.dark).font('Helvetica');
      for (const line of (section.content || '').split('\n')) {
        if (doc.y > doc.page.height - 80) doc.addPage();
        const t = line.trim();
        if (!t) { doc.moveDown(0.3); continue; }
        doc.text(t, 50, doc.y, { width: doc.page.width - 100 });
        doc.moveDown(0.25);
      }
      doc.moveDown(0.6);
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(C.muted)
        .text(`Dream Wave AI · Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 40, {
          align: 'center',
          width: doc.page.width - 100,
        });
    }

    doc.end();
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { generatePDF, REPORTS_DIR };

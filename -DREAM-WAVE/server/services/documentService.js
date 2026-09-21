const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function detectFileType(filename = '', mime = '') {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf' || mime.includes('pdf')) return 'pdf';
  if (ext === '.docx' || mime.includes('wordprocessingml')) return 'docx';
  if (ext === '.ppt' || ext === '.pptx' || mime.includes('presentation')) return ext === '.ppt' ? 'ppt' : 'pptx';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext) || mime.startsWith('image/')) return 'image';
  if (['.txt', '.md', '.csv', '.json'].includes(ext) || mime.startsWith('text/')) return 'text';
  return 'other';
}

async function extractText(filePath, fileType, originalName) {
  const fsp = fs.promises;
  try {
    if (fileType === 'text') {
      const raw = await fsp.readFile(filePath, 'utf8');
      return raw.slice(0, 100000);
    }
    if (fileType === 'pdf') {
      try {
        const pdfParse = require('pdf-parse');
        const buf = await fsp.readFile(filePath);
        const data = await pdfParse(buf);
        return (data.text || '').slice(0, 100000);
      } catch (err) {
        logger.warn('pdf-parse unavailable', { error: err.message });
        return `[PDF uploaded: ${originalName}. Text extraction pending — ask AI to analyze based on filename and your questions.]`;
      }
    }
    if (fileType === 'docx') {
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        return (result.value || '').slice(0, 100000);
      } catch (err) {
        logger.warn('mammoth unavailable', { error: err.message });
        return `[DOCX uploaded: ${originalName}. Provide questions for AI analysis.]`;
      }
    }
    if (fileType === 'image') {
      return `[Image uploaded: ${originalName}. Describe what you need explained, summarized, or extracted.]`;
    }
    if (fileType === 'ppt' || fileType === 'pptx') {
      return `[Presentation uploaded: ${originalName}. Ask for slide-style summaries, key points, or quiz questions.]`;
    }
    return `[File uploaded: ${originalName}]`;
  } catch (err) {
    logger.error('extractText failed', { error: err.message });
    return '';
  }
}

module.exports = { detectFileType, extractText };

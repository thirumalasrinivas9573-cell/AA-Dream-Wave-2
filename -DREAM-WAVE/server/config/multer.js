const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^\w.]/g, '');
    cb(null, `${unique}${ext}`);
  },
});

const IMAGE_MIME = {
  '.jpg': /^image\/jpeg$/i,
  '.jpeg': /^image\/jpeg$/i,
  '.png': /^image\/png$/i,
  '.gif': /^image\/gif$/i,
  '.webp': /^image\/webp$/i,
};

const DOC_MIME = {
  '.jpg': /^image\/jpeg$/i,
  '.jpeg': /^image\/jpeg$/i,
  '.png': /^image\/png$/i,
  '.gif': /^image\/gif$/i,
  '.webp': /^image\/webp$/i,
  '.pdf': /^application\/pdf$/i,
  '.txt': /^text\/plain$/i,
  '.md': /^(text\/(plain|markdown)|application\/octet-stream)$/i,
  '.doc': /^application\/msword$/i,
  '.docx': /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i,
  '.ppt': /^application\/vnd\.ms-powerpoint$/i,
  '.pptx': /^application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation$/i,
  '.csv': /^(text\/csv|application\/vnd\.ms-excel|text\/plain)$/i,
  '.json': /^(application\/json|text\/plain)$/i,
};

const MEDIA_MIME = {
  '.mp4': /^video\/mp4$/i,
  '.webm': /^video\/webm$/i,
  '.mov': /^video\/quicktime$/i,
  '.mkv': /^video\/x-matroska$/i,
  '.mp3': /^audio\/mpeg$/i,
  '.wav': /^audio\/(wav|x-wav|wave)$/i,
  '.m4a': /^audio\/(mp4|x-m4a|aac)$/i,
  '.aac': /^audio\/aac$/i,
  '.ogg': /^(audio|video)\/ogg$/i,
  '.flac': /^audio\/flac$/i,
  '.gif': /^image\/gif$/i,
};

function mimeAndExtMatch(file, map, { allowOctetStream = false } = {}) {
  const ext = path.extname(file.originalname).toLowerCase();
  const rule = map[ext];
  if (!rule) return false;
  if (rule.test(file.mimetype)) return true;
  if (allowOctetStream && /^application\/octet-stream$/i.test(file.mimetype)) return true;
  return false;
}

const imageFilter = (_req, file, cb) => {
  const ok = mimeAndExtMatch(file, IMAGE_MIME) && !/\.svg$/i.test(file.originalname);
  cb(ok ? null : new Error('Only image files are allowed'), ok);
};

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (/\.(html?|svg|xhtml|js|mjs|cjs|php|exe|sh|bat|cmd|ps1)$/i.test(ext)) {
    return cb(new Error('File type not allowed'), false);
  }
  if (/^text\/html/i.test(file.mimetype) || /^image\/svg/i.test(file.mimetype)) {
    return cb(new Error('File type not allowed'), false);
  }
  const ok = mimeAndExtMatch(file, DOC_MIME, { allowOctetStream: true });
  cb(ok ? null : new Error('File type not allowed'), ok);
};

const mediaFilter = (_req, file, cb) => {
  const ok = mimeAndExtMatch(file, MEDIA_MIME, { allowOctetStream: true });
  cb(ok ? null : new Error('Only video, audio, or animation media files are allowed'), ok);
};

exports.uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

exports.uploadFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
});

exports.uploadDocument = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter,
});

exports.uploadMedia = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: mediaFilter,
});

import multer from 'multer';
import path from 'node:path';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream', // biometric raw .dat files
];

const PROHIBITED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.js', '.mjs', '.vbs', '.scr', '.ps1', '.jar', '.dll', '.com',
];

export const safeFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (PROHIBITED_EXTENSIONS.includes(ext)) {
      const err = new Error(`File upload rejected: Prohibited executable file type '${ext}'`);
      err.status = 400;
      err.code = 'FILE_TYPE_PROHIBITED';
      return cb(err);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype) && !ext) {
      const err = new Error(`File upload rejected: Unsupported MIME type '${file.mimetype}'`);
      err.status = 400;
      err.code = 'UNSUPPORTED_MIME_TYPE';
      return cb(err);
    }

    cb(null, true);
  },
});

export default safeFileUpload;


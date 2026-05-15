import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      callback(null, uploadDir);
    } catch (error) {
      callback(error as Error, uploadDir);
    }
  },
  filename: (_req, file, callback) => {
    const safeOriginalName = file.originalname.replace(/\s+/g, '_');
    callback(null, `${Date.now()}-${safeOriginalName}`);
  },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback): void {
  if (allowedMimeTypes.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new Error('Only PDF and Word documents are allowed'));
}

export const uploadCv = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export { uploadDir };

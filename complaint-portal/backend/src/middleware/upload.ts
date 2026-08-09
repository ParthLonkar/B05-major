import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';

const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'complaints');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const mimeType = file.mimetype.toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_MIME_TYPES.has(mimeType) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (FR-UA-01)
  },
});

const multerSingle = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

/**
 * Middleware for single image upload with clean error handling
 */
export const uploadSingleImage = (req: Request, res: Response, next: NextFunction): void => {
  multerSingle(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({
            success: false,
            error: 'File size exceeds maximum limit of 10MB.',
          });
          return;
        }
        res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
        });
        return;
      }

      if (err.message === 'INVALID_FILE_TYPE') {
        res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: err.message || 'File upload failed.',
      });
      return;
    }

    // Attach single uploaded file to req.file if uploaded under 'image' or 'file' field
    const filesObj = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (filesObj) {
      const uploadedFile = filesObj['image']?.[0] || filesObj['file']?.[0];
      if (uploadedFile) {
        req.file = uploadedFile;
      }
    }

    next();
  });
};

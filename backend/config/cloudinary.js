import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'node:path';
import { env } from './env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'studyarena/resources';
    if (file.mimetype.startsWith('audio/')) folder = 'studyarena/recordings';
    if (file.mimetype.startsWith('image/')) folder = 'studyarena/images';

    const ext = path.extname(file.originalname || '').toLowerCase();
    const nameWithoutExt = path.basename(file.originalname || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = `${Date.now()}-${nameWithoutExt}`;

    return {
      folder: folder,
      resource_type: 'auto',
      public_id: publicId
    };
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});
export { cloudinary };

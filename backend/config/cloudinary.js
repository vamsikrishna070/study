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
    let resourceType = 'auto';

    const mime = (file.mimetype || '').toLowerCase();
    const originalName = file.originalname || '';
    const ext = path.extname(originalName).toLowerCase();
    const isPdf = mime === 'application/pdf' || ext === '.pdf';
    const isDoc = isPdf || mime.includes('document') || mime.includes('msword') || mime.includes('officedocument') || mime.includes('presentation') || mime.includes('powerpoint') || ['.docx', '.doc', '.pptx', '.ppt', '.txt'].includes(ext);

    if (mime.startsWith('audio/')) {
      folder = 'studyarena/recordings';
      resourceType = 'video';
    } else if (mime.startsWith('image/')) {
      folder = 'studyarena/images';
      resourceType = 'image';
    } else if (mime.startsWith('video/')) {
      folder = 'studyarena/videos';
      resourceType = 'video';
    } else if (isDoc) {
      folder = 'studyarena/resources';
      resourceType = 'raw';
    }

    const nameWithoutExt = path.basename(originalName || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const publicId = resourceType === 'raw' && ext
      ? `${Date.now()}-${nameWithoutExt}${ext}`
      : `${Date.now()}-${nameWithoutExt}`;

    return {
      folder: folder,
      resource_type: resourceType,
      public_id: publicId
    };
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});
export { cloudinary };

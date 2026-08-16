import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
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

    // Allow raw file formats (PDF, DOCX, etc.)
    const isRaw = !file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/') && !file.mimetype.startsWith('audio/');
    
    return {
      folder: folder,
      resource_type: isRaw ? 'raw' : 'auto',
      public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`
    };
  },
});

export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
export { cloudinary };

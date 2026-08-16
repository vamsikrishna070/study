import express from 'express';
import { upload } from '../config/cloudinary.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  res.json({
    success: true,
    data: {
      url: req.file.path,
      publicId: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size
    }
  });
});

export default router;

import express from 'express';
import { Readable } from 'node:stream';
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

router.get('/preview', async (req, res) => {
  try {
    const fileUrl = req.query.url;
    const filename = String(req.query.filename || 'document.pdf');

    if (!fileUrl || typeof fileUrl !== 'string') {
      return res.status(400).send('Missing file URL');
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return res.status(400).send('Invalid file URL');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).send('Invalid protocol');
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch file: ${response.statusText}`);
    }

    const rawContentType = response.headers.get('content-type') || '';
    const isPdf = filename.toLowerCase().endsWith('.pdf') || fileUrl.toLowerCase().includes('.pdf') || rawContentType.includes('pdf');
    const isImage = rawContentType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(filename);

    let contentType = rawContentType;
    if (isPdf) {
      contentType = 'application/pdf';
    } else if (isImage && !contentType.startsWith('image/')) {
      contentType = 'image/jpeg';
    } else if (!contentType || contentType.includes('octet-stream')) {
      contentType = isPdf ? 'application/pdf' : 'application/octet-stream';
    }

    const cleanFilename = filename.replace(/["\r\n]/g, '');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${cleanFilename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error('[UploadRoutes] Error streaming preview:', err);
    res.status(500).send('Error streaming document preview');
  }
});

export default router;

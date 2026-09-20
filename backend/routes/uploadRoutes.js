import express from 'express';
import { Readable } from 'node:stream';
import { upload } from '../config/cloudinary.js';
import { protect } from '../middleware/authMiddleware.js';
import { fetchRemoteDocument } from '../utils/documentFetchHelper.js';

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
    const rawFilename = String(req.query.filename || 'document.pdf');

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

    const { response } = await fetchRemoteDocument(fileUrl);
    if (!response || !response.ok) {
      return res.status(response?.status || 502).send(`Failed to fetch file: ${response?.statusText || 'Fetch failed'}`);
    }

    const rawContentType = response.headers.get('content-type') || '';
    const cleanName = rawFilename.replace(/["\r\n]/g, '').trim() || 'document.pdf';
    const isPdf = cleanName.toLowerCase().endsWith('.pdf') || fileUrl.toLowerCase().includes('.pdf') || rawContentType.includes('pdf');
    const isImage = rawContentType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(cleanName);

    let contentType = rawContentType;
    if (isPdf) {
      contentType = 'application/pdf';
    } else if (isImage && !contentType.startsWith('image/')) {
      contentType = 'image/jpeg';
    } else if (!contentType || contentType.includes('octet-stream')) {
      contentType = isPdf ? 'application/pdf' : 'application/octet-stream';
    }

    const safeAsciiFilename = cleanName.replace(/[^\w.-]/g, '_');
    const encodedFilename = encodeURIComponent(cleanName);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
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

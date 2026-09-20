import { cloudinary } from '../config/cloudinary.js';

export function getCloudinaryCandidateUrls(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.includes('cloudinary.com')) {
    return [fileUrl];
  }

  const cleanUrl = fileUrl.trim();
  const candidates = new Set();
  candidates.add(cleanUrl);

  try {
    const parsed = new URL(cleanUrl);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const uploadIndex = pathParts.findIndex((p) => p === 'upload');

    if (uploadIndex !== -1 && uploadIndex >= 1) {
      const cloudName = pathParts[0];
      const detectedRt = pathParts[uploadIndex - 1] || 'image';
      const afterUpload = pathParts.slice(uploadIndex + 1);

      let version = '';
      const remainingParts = [];
      for (const part of afterUpload) {
        if (/^v\d+$/.test(part)) {
          version = part;
        } else if (!part.startsWith('fl_') && !part.startsWith('f_') && !part.startsWith('s--')) {
          remainingParts.push(part);
        }
      }

      const resourcePath = remainingParts.join('/');
      const hasExt = /\.[a-zA-Z0-9]+$/.test(resourcePath);
      const pathWithoutExt = hasExt ? resourcePath.substring(0, resourcePath.lastIndexOf('.')) : resourcePath;
      const pathWithPdf = hasExt ? resourcePath : `${resourcePath}.pdf`;

      // 1. Authenticated signed private download URLs via Cloudinary SDK
      const authCandidates = [
        { pid: pathWithoutExt, fmt: 'pdf', rt: 'image' },
        { pid: resourcePath, fmt: '', rt: 'raw' },
        { pid: pathWithoutExt, fmt: '', rt: 'raw' },
        { pid: resourcePath, fmt: 'pdf', rt: 'image' },
        { pid: pathWithPdf, fmt: '', rt: 'raw' },
      ];

      // Prioritize detected resource type
      if (detectedRt === 'raw') {
        authCandidates.sort((a, b) => (a.rt === 'raw' ? -1 : b.rt === 'raw' ? 1 : 0));
      }

      for (const item of authCandidates) {
        try {
          const authUrl = cloudinary.utils.private_download_url(item.pid, item.fmt, {
            resource_type: item.rt,
            type: 'upload',
            expires_at: Math.floor(Date.now() / 1000) + 7200
          });
          if (authUrl) {
            candidates.add(authUrl);
          }
        } catch {
          // Ignore URL generation errors
        }
      }

      // 2. Direct public candidate variants
      const resourceTypes = [detectedRt, detectedRt === 'image' ? 'raw' : 'image'];
      const versionOptions = version ? [version, ''] : [''];
      const pathOptions = Array.from(new Set([resourcePath, pathWithPdf, pathWithoutExt]));
      const flagOptions = ['', 'fl_attachment'];

      for (const rt of resourceTypes) {
        for (const fl of flagOptions) {
          for (const ver of versionOptions) {
            for (const p of pathOptions) {
              const segments = [cloudName, rt, 'upload'];
              if (fl) segments.push(fl);
              if (ver) segments.push(ver);
              segments.push(p);

              candidates.add(`${parsed.origin}/${segments.join('/')}`);
            }
          }
        }
      }
    }
  } catch {
    if (!cleanUrl.includes('fl_attachment')) {
      candidates.add(cleanUrl.replace('/upload/', '/upload/fl_attachment/'));
    }
  }

  return Array.from(candidates);
}

export async function fetchRemoteDocument(fileUrl, options = {}) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    throw new Error('Missing file URL');
  }

  const urlsToTry = getCloudinaryCandidateUrls(fileUrl);
  let lastResponse = null;
  let lastError = null;

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        return { response: res, effectiveUrl: url };
      }
      lastResponse = res;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastResponse) {
    return { response: lastResponse, effectiveUrl: urlsToTry[0] };
  }

  throw lastError || new Error('Failed to fetch remote document');
}

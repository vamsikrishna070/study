/**
 * Robust remote document fetcher with automatic fallbacks for Cloudinary
 * delivery policies, fl_attachment flags, and resource type matching.
 */

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
      const afterUpload = pathParts.slice(uploadIndex + 1);

      let version = '';
      const remainingParts = [];
      for (const part of afterUpload) {
        if (/^v\d+$/.test(part)) {
          version = part;
        } else if (!part.startsWith('fl_') && !part.startsWith('f_')) {
          remainingParts.push(part);
        }
      }

      const resourcePath = remainingParts.join('/');
      const hasExt = /\.[a-zA-Z0-9]+$/.test(resourcePath);
      const pathWithoutExt = hasExt ? resourcePath.substring(0, resourcePath.lastIndexOf('.')) : resourcePath;
      const pathWithPdf = hasExt ? resourcePath : `${resourcePath}.pdf`;

      const resourceTypes = ['raw', 'image'];
      const versionOptions = version ? [version, ''] : [''];
      const pathOptions = Array.from(new Set([resourcePath, pathWithPdf, pathWithoutExt, `${pathWithPdf}.pdf`]));
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
    if (cleanUrl.includes('/image/upload/')) {
      candidates.add(cleanUrl.replace('/image/upload/', '/raw/upload/'));
      candidates.add(cleanUrl.replace('/image/upload/', '/raw/upload/fl_attachment/'));
    } else if (cleanUrl.includes('/raw/upload/')) {
      candidates.add(cleanUrl.replace('/raw/upload/', '/image/upload/'));
      candidates.add(cleanUrl.replace('/raw/upload/', '/image/upload/fl_attachment/'));
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

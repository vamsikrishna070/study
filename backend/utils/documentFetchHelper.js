
export async function fetchRemoteDocument(fileUrl, options = {}) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    throw new Error('Missing file URL');
  }

  const urlsToTry = [fileUrl];

  if (fileUrl.includes('cloudinary.com')) {
    if (!fileUrl.includes('fl_attachment')) {
      const withAttachment = fileUrl.replace('/upload/', '/upload/fl_attachment/');
      if (!urlsToTry.includes(withAttachment)) urlsToTry.push(withAttachment);
    } else {
      const withoutAttachment = fileUrl.replace(/\/fl_attachment[^/]*\//, '/');
      if (!urlsToTry.includes(withoutAttachment)) urlsToTry.push(withoutAttachment);
    }

    if (fileUrl.includes('/image/upload/')) {
      const rawUrl = fileUrl.replace('/image/upload/', '/raw/upload/');
      if (!urlsToTry.includes(rawUrl)) urlsToTry.push(rawUrl);
      const rawAttUrl = rawUrl.replace('/upload/', '/upload/fl_attachment/');
      if (!urlsToTry.includes(rawAttUrl)) urlsToTry.push(rawAttUrl);
    } else if (fileUrl.includes('/raw/upload/')) {
      const imgUrl = fileUrl.replace('/raw/upload/', '/image/upload/');
      if (!urlsToTry.includes(imgUrl)) urlsToTry.push(imgUrl);
      const imgAttUrl = imgUrl.replace('/upload/', '/upload/fl_attachment/');
      if (!urlsToTry.includes(imgAttUrl)) urlsToTry.push(imgAttUrl);
    }
  }

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

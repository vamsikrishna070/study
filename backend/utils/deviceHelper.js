import crypto from 'crypto';

export function hashSessionId(sessionId) {
  return crypto.createHash('sha256').update(String(sessionId)).digest('hex');
}

export function maskIpAddress(ip) {
  if (!ip || typeof ip !== 'string') return '';
  const cleanIp = ip.trim();

  // IPv4
  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  }

  // IPv6
  if (cleanIp.includes(':')) {
    const parts = cleanIp.split(':');
    if (parts.length > 2) {
      return `${parts.slice(0, 3).join(':')}::xxxx`;
    }
  }

  return cleanIp;
}

export function parseClientInfo(req) {
  const ua = req.headers['user-agent'] || '';
  const customPlatform = req.headers['x-platform'] || '';
  const customDeviceName = req.headers['x-device-name'] || '';

  const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || '';
  const ipAddress = maskIpAddress(rawIp);

  let platform = 'unknown';
  let deviceType = 'desktop';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  const uaLower = ua.toLowerCase();

  // Detect OS
  if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/cros/i.test(ua)) os = 'ChromeOS';

  // Detect Browser
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';

  // Mobile App check
  if (customPlatform.toLowerCase() === 'ios' || /studyarenamobile.*ios/i.test(ua)) {
    platform = 'ios';
    deviceType = 'mobile';
    browser = 'StudyArena iOS';
    os = 'iOS';
  } else if (customPlatform.toLowerCase() === 'android' || /studyarenamobile.*android/i.test(ua) || /okhttp/i.test(ua)) {
    platform = 'android';
    deviceType = 'mobile';
    browser = 'StudyArena Android';
    os = 'Android';
  } else if (/iphone|ipod/i.test(ua)) {
    platform = 'ios';
    deviceType = 'mobile';
  } else if (/ipad/i.test(ua)) {
    platform = 'ios';
    deviceType = 'tablet';
  } else if (/android/i.test(ua)) {
    platform = 'android';
    deviceType = /mobile/i.test(ua) ? 'mobile' : 'tablet';
  } else if (os === 'Windows' || os.startsWith('Windows') || os === 'macOS' || os === 'Linux' || os === 'ChromeOS') {
    platform = 'web';
    deviceType = 'desktop';
  } else {
    platform = 'web';
  }

  // Construct readable device name
  let deviceName = customDeviceName || '';
  if (!deviceName) {
    if (browser.startsWith('StudyArena')) {
      deviceName = `${browser} on ${os}`;
    } else if (browser !== 'Unknown Browser' && os !== 'Unknown OS') {
      deviceName = `${browser} on ${os}`;
    } else if (browser !== 'Unknown Browser') {
      deviceName = browser;
    } else if (os !== 'Unknown OS') {
      deviceName = `${os} Device`;
    } else {
      deviceName = 'Web Browser';
    }
  }

  return {
    deviceName,
    deviceType,
    platform,
    browser,
    os,
    ipAddress,
  };
}

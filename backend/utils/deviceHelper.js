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
  const headers = req?.headers || {};
  const ua = headers['user-agent'] || (typeof req?.get === 'function' ? req.get('user-agent') : '') || '';
  
  // Prioritize explicit mobile headers and body payload
  const customPlatform = (
    headers['x-platform'] ||
    (typeof req?.get === 'function' ? req.get('x-platform') : '') ||
    req?.body?.platform ||
    ''
  ).toLowerCase().trim();

  const customDeviceName =
    headers['x-device-name'] ||
    (typeof req?.get === 'function' ? req.get('x-device-name') : '') ||
    req?.body?.deviceName ||
    '';

  const clientType = (
    headers['x-client-type'] ||
    (typeof req?.get === 'function' ? req.get('x-client-type') : '') ||
    ''
  ).toLowerCase().trim();

  const rawIp =
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req?.socket?.remoteAddress ||
    req?.ip ||
    '';
  const ipAddress = maskIpAddress(rawIp);

  let platform = 'unknown';
  let deviceType = 'desktop';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let deviceName = customDeviceName || '';

  const uaLower = ua.toLowerCase();
  const isExplicitMobile =
    customPlatform === 'android' ||
    customPlatform === 'ios' ||
    clientType === 'mobile' ||
    uaLower.includes('studyarenamobile') ||
    uaLower.includes('okhttp') ||
    uaLower.includes('expo');

  // 1. If explicit mobile headers or mobile client detected, prioritize mobile identification
  if (isExplicitMobile) {
    if (customPlatform === 'ios' || /iphone|ipad|ipod/i.test(uaLower)) {
      platform = 'ios';
      os = 'iOS';
      browser = 'StudyArena iOS';
      deviceType = /ipad/i.test(uaLower) ? 'tablet' : 'mobile';
      if (!deviceName) {
        deviceName = /ipad/i.test(uaLower) ? 'StudyArena on iPad' : 'StudyArena on iOS';
      }
    } else {
      platform = 'android';
      os = 'Android';
      browser = 'StudyArena Android';
      deviceType = 'mobile';
      if (!deviceName) {
        deviceName = 'StudyArena on Android';
      }
    }
  } else {
    // 2. Web / Browser User-Agent parsing
    if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10/11';
    else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
    else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
    else if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/iphone|ipod/i.test(ua)) { os = 'iOS'; platform = 'ios'; deviceType = 'mobile'; }
    else if (/ipad/i.test(ua)) { os = 'iOS'; platform = 'ios'; deviceType = 'tablet'; }
    else if (/android/i.test(ua)) { os = 'Android'; platform = 'android'; deviceType = 'mobile'; }
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/cros/i.test(ua)) os = 'ChromeOS';

    if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
    else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
    else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';

    if (platform === 'unknown') {
      platform = 'web';
      deviceType = 'desktop';
    }

    if (!deviceName) {
      if (browser !== 'Unknown Browser' && os !== 'Unknown OS') {
        deviceName = `${browser} on ${os}`;
      } else if (browser !== 'Unknown Browser') {
        deviceName = browser;
      } else if (os !== 'Unknown OS') {
        deviceName = `${os} Device`;
      } else {
        deviceName = 'Web Browser';
      }
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

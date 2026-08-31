import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';
import SrmPortalAccount from '../../models/SrmPortalAccount.js';
import User from '../../models/User.js';
import Subject from '../../models/Subject.js';
import { decryptPortalSecret, encryptPortalSecret } from '../../utils/portalCrypto.js';
import { attemptSrmLogin } from './srmPortalService.js';

const BASE_URL = 'https://student.srmap.edu.in/srmapstudentcorner';
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
};

// Standard hour slots for SRM AP timetable
const HOUR_SLOTS = [
  { hour: 1, startTime: '09:00', endTime: '09:50' },
  { hour: 2, startTime: '09:50', endTime: '10:40' },
  { hour: 3, startTime: '10:50', endTime: '11:40' },
  { hour: 4, startTime: '11:40', endTime: '12:30' },
  { hour: 5, startTime: '13:30', endTime: '14:20' },
  { hour: 6, startTime: '14:20', endTime: '15:10' },
  { hour: 7, startTime: '15:20', endTime: '16:10' },
  { hour: 8, startTime: '16:10', endTime: '17:00' },
  { hour: 9, startTime: '17:00', endTime: '17:50' },
  { hour: 10, startTime: '17:50', endTime: '18:40' },
];

/**
 * Fetch an active JSESSIONID for the user's SRM portal account.
 */
export async function getActiveSession(account) {
  const existingSession = decryptPortalSecret(account.encryptedSessionId);
  if (existingSession) {
    try {
      // Test existing session with lightweight HRD call
      const checkRes = await fetch(`${BASE_URL}/HRDSystem`, {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          'Cookie': `JSESSIONID=${existingSession}`,
        },
      });
      if (checkRes.ok) {
        const text = await checkRes.text();
        if (text && !/login|session expired|invalid/i.test(text)) {
          return existingSession;
        }
      }
    } catch {
      // Ignore network failure, attempt fresh login
    }
  }

  // Attempt fresh login using stored encrypted password & username
  const rawPassword = decryptPortalSecret(account.encryptedPassword);
  if (!rawPassword || !account.srmUsername) {
    account.connectionStatus = 'expired';
    await account.save();
    throw new Error('PORTAL_SESSION_EXPIRED');
  }

  console.log(`[PortalSession] Session expired or invalid. Attempting background re-login for user ${account.userId}...`);
  const freshSession = await attemptSrmLogin(account.srmUsername, rawPassword);
  account.encryptedSessionId = encryptPortalSecret(freshSession);
  account.connectionStatus = 'connected';
  await account.save();

  return freshSession;
}

/**
 * Normalizes day order and today's attendance records from SRM AP Portal.
 */
export async function getCurrentAttendance(userId) {
  const account = await SrmPortalAccount.findOne({ userId }).select('+encryptedPassword +encryptedSessionId');
  if (!account) {
    return {
      isConnected: false,
      dayOrder: null,
      date: DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd'),
      attendance: [],
    };
  }

  let sessionId;
  try {
    sessionId = await getActiveSession(account);
  } catch (err) {
    const cachedClasses = Array.isArray(account.todayAttendanceCache) && account.todayAttendanceCache.length > 0
      ? account.todayAttendanceCache
      : (account.attendanceCache || []);

    return {
      isConnected: true,
      sessionExpired: true,
      dayOrder: account.profileCache?.dayOrder || null,
      date: DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd'),
      attendance: cachedClasses,
      subjectStats: account.attendanceCache || [],
      lastSynced: account.lastSuccessfulSync,
    };
  }

  const todayIst = DateTime.now().setZone('Asia/Kolkata');
  const dateStr = todayIst.toFormat('yyyy-MM-dd');

  // Fetch report page 3 (Subject-wise Attendance & Daily Conduct)
  const params = new URLSearchParams({ page: '3' });
  const response = await fetch(`${BASE_URL}/HRDSystem`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': `JSESSIONID=${sessionId}`,
    },
    body: params.toString(),
  }).then((res) => res.text()).catch(() => '');

  const $ = cheerio.load(response);

  // Extract Day Order (e.g. "Day Order - 3" or "Day Order: 3")
  let dayOrder = null;
  const pageText = $.text();
  const dayOrderMatch = pageText.match(/Day\s*Order\s*[-:]?\s*(\d+)/i);
  if (dayOrderMatch) {
    dayOrder = parseInt(dayOrderMatch[1], 10);
  }

  // Parse subject-wise attendance summary
  const subjectAttendanceList = [];
  $('table#tblSubjectWiseAttendance tr').each((_, row) => {
    const td = $(row).find('td');
    if (td.length >= 7) {
      const code = td.eq(0).text().trim();
      const name = td.eq(1).text().trim();
      const conducted = parseInt(td.eq(2).text().trim(), 10) || 0;
      const present = parseInt(td.eq(3).text().trim(), 10) || 0;
      const absent = parseInt(td.eq(4).text().trim(), 10) || 0;
      const odMl = td.length >= 6 ? (parseInt(td.eq(5).text().trim(), 10) || 0) : 0;
      const pctStr = (td.length >= 9 ? td.eq(8) : td.eq(6)).text().trim().replace('%', '');
      const pct = parseFloat(pctStr) || 0;

      if (code && name) {
        subjectAttendanceList.push({
          subjectCode: code,
          subjectName: name,
          conducted,
          present,
          absent,
          odMl,
          percentage: pct,
        });
      }
    }
  });

  // Extract today's timetable slot mapping for current day order
  const weeklyTimetable = account.timetableCache || [];
  const dayNames = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const todayDayName = todayIst.setLocale('en-US').toFormat('EEEE').toUpperCase();
  const todayTimetableRow = weeklyTimetable.find((t) => t.day?.toUpperCase() === todayDayName) || null;

  // Build today's class slot items
  const todayClasses = [];
  const subjectsMap = new Map();
  (account.subjectsCache || []).forEach((s) => {
    if (s.code) subjectsMap.set(s.code, s);
  });

  if (todayTimetableRow && Array.isArray(todayTimetableRow.subjects)) {
    todayTimetableRow.subjects.forEach((slotSubjectCode, idx) => {
      const hourNumber = idx + 1;
      const hourSlot = HOUR_SLOTS.find((h) => h.hour === hourNumber) || {
        hour: hourNumber,
        startTime: `${8 + hourNumber}:00`,
        endTime: `${8 + hourNumber}:50`,
      };

      if (slotSubjectCode && slotSubjectCode !== '-' && slotSubjectCode !== 'NIL') {
        const subDetails = subjectsMap.get(slotSubjectCode) || {};
        const subjectSummary = subjectAttendanceList.find((s) => s.subjectCode === slotSubjectCode);

        todayClasses.push({
          hour: hourNumber,
          startTime: hourSlot.startTime,
          endTime: hourSlot.endTime,
          subjectCode: slotSubjectCode,
          subjectName: subDetails.name || subjectSummary?.subjectName || slotSubjectCode,
          faculty: subDetails.faculty || '',
          room: subDetails.classrooms || 'AB1',
          status: 'NOT MARKED',
          facultyCabin: subDetails.facultyCabin || null,
        });
      }
    });
  }

  // Scan Daily Conduct to update statuses of today's classes
  const normalizeCode = (c) => (c || '').replace(/\s+/g, ' ').trim().toUpperCase();
  const todayDateStrVariations = [
    todayIst.toFormat('dd-MM-yyyy'),
    todayIst.toFormat('dd-MMM-yyyy'),
    todayIst.toFormat('d-MMM-yyyy'),
    todayIst.toFormat('dd/MM/yyyy'),
    todayIst.toFormat('yyyy-MM-dd'),
    todayIst.toFormat('dd-MM-yy'),
    todayIst.toFormat('dd-MMM-yy'),
  ].map(s => s.toLowerCase());

  $('table tr').each((_, row) => {
    const td = $(row).find('td');
    if (td.length >= 5) {
      let dateColIdx = -1;
      for (let i = 0; i < td.length; i++) {
        const text = td.eq(i).text().trim().toLowerCase();
        if (todayDateStrVariations.some(v => text.includes(v))) {
          dateColIdx = i;
          break;
        }
      }

      if (dateColIdx !== -1) {
        const offset = dateColIdx; 
        const hourText = td.eq(offset + 1).text().trim();
        const parsedHour = parseInt(hourText, 10);
        
        if (!isNaN(parsedHour) && parsedHour >= 1 && parsedHour <= 10) {
          const subjectCode = normalizeCode(td.eq(offset + 2).text().trim());
          let status = '';

          for (let i = offset + 3; i < td.length; i++) {
            const txt = td.eq(i).text().trim().toUpperCase();
            if (txt.includes('PRESENT') || txt.includes('ABSENT') || txt.includes('OD') || txt.includes('ML') || txt.includes('LATE') || txt.includes('NOT MARKED')) {
              status = txt;
              break;
            }
          }

          if (parsedHour && subjectCode) {
            const match = todayClasses.find(c => c.hour === parsedHour && normalizeCode(c.subjectCode) === subjectCode);
            if (match) {
              if (status.includes('PRESENT')) match.status = 'PRESENT';
              else if (status.includes('ABSENT')) match.status = 'ABSENT';
              else if (status.includes('OD') || status.includes('ML')) match.status = 'OD/ML';
              else if (status.includes('NOT MARKED')) match.status = 'NOT MARKED';
              else match.status = status;
            }
          }
        }
      }
    }
  });

  // Update account attendanceCache & history
  account.attendanceCache = subjectAttendanceList;
  account.todayAttendanceCache = todayClasses;
  if (dayOrder) {
    account.profileCache = { ...(account.profileCache || {}), dayOrder };
  }
  account.markModified('attendanceCache');
  account.markModified('todayAttendanceCache');
  account.markModified('profileCache');
  await account.save();

  return {
    isConnected: true,
    dayOrder: dayOrder || 1,
    date: dateStr,
    attendance: todayClasses,
    subjectStats: subjectAttendanceList,
  };
}

/**
 * Submits an online attendance code to official SRM AP portal.
 */
export async function submitAttendanceCode(userId, attendanceCode) {
  if (!attendanceCode || typeof attendanceCode !== 'string') {
    return {
      success: false,
      code: 'INVALID_CODE',
      message: 'The attendance code is invalid or has expired.',
    };
  }

  const cleanCode = attendanceCode.trim().toUpperCase();
  if (cleanCode.length < 3 || cleanCode.length > 15) {
    return {
      success: false,
      code: 'INVALID_CODE',
      message: 'The attendance code is invalid or has expired.',
    };
  }

  const account = await SrmPortalAccount.findOne({ userId }).select('+encryptedPassword +encryptedSessionId');
  if (!account) {
    return {
      success: false,
      code: 'PORTAL_UNAVAILABLE',
      message: 'SRM Portal account is not connected.',
    };
  }

  let sessionId;
  try {
    sessionId = await getActiveSession(account);
  } catch {
    return {
      success: false,
      code: 'PORTAL_SESSION_EXPIRED',
      message: 'Your SRM portal session has expired. Please reconnect.',
    };
  }

  // Submit code to official SRM AP attendance endpoint
  try {
    const params = new URLSearchParams({
      page: '12',
      txtCode: cleanCode,
      optMark: '1',
    });

    const responseText = await fetch(`${BASE_URL}/HRDSystem`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `JSESSIONID=${sessionId}`,
        'Referer': `${BASE_URL}/HRDSystem`,
      },
      body: params.toString(),
    }).then((res) => res.text());

    const lower = responseText.toLowerCase();

    if (lower.includes('already marked') || lower.includes('already submitted')) {
      return {
        success: false,
        code: 'ALREADY_MARKED',
        message: 'Attendance has already been marked for this class.',
      };
    }

    if (lower.includes('invalid code') || lower.includes('wrong code') || lower.includes('expired')) {
      return {
        success: false,
        code: 'INVALID_CODE',
        message: 'The attendance code is invalid or has expired.',
      };
    }

    if (lower.includes('window closed') || lower.includes('not open') || lower.includes('closed')) {
      return {
        success: false,
        code: 'ATTENDANCE_NOT_OPEN',
        message: 'Attendance window is currently closed for this class.',
      };
    }

    if (lower.includes('session expired') || lower.includes('login')) {
      account.connectionStatus = 'expired';
      await account.save();
      return {
        success: false,
        code: 'PORTAL_SESSION_EXPIRED',
        message: 'Your SRM portal session has expired. Please reconnect.',
      };
    }

    // Default success confirmation check (or fallback if portal returned successful mark)
    return {
      success: true,
      message: 'Attendance marked successfully!',
      status: 'PRESENT',
    };
  } catch (err) {
    console.error('[SrmAttendanceService] Error submitting code:', err);
    return {
      success: false,
      code: 'PORTAL_UNAVAILABLE',
      message: 'SRM portal is currently unavailable. Please try again.',
    };
  }
}

/**
 * Normalizes full weekly timetable from Monday to Saturday.
 */
export async function getTimetable(userId) {
  const account = await SrmPortalAccount.findOne({ userId });
  if (!account) {
    return {
      isConnected: false,
      timetable: {},
    };
  }

  const rawTimetable = account.timetableCache || [];
  const rawSubjects = account.subjectsCache || [];

  const subjectMap = new Map();
  const normalizeCode = (c) => (c || '').replace(/\s+/g, ' ').trim().toUpperCase();
  rawSubjects.forEach((sub) => {
    if (sub.code && sub.isSrmActive !== false) {
      subjectMap.set(sub.code, sub);
      subjectMap.set(normalizeCode(sub.code), sub);
    }
  });

  const daysMap = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  };

  rawTimetable.forEach((row) => {
    const dayKey = (row.day || '').toLowerCase();
    if (daysMap[dayKey] !== undefined && Array.isArray(row.subjects)) {
      row.subjects.forEach((code, idx) => {
        const hourNum = idx + 1;
        const slot = HOUR_SLOTS.find((h) => h.hour === hourNum) || {
          hour: hourNum,
          startTime: `${8 + hourNum}:00`,
          endTime: `${8 + hourNum}:50`,
        };

        if (code && code !== '-' && code !== 'NIL') {
          const norm = normalizeCode(code);
          const subInfo = subjectMap.get(code) || subjectMap.get(norm) || {};
          daysMap[dayKey].push({
            hour: hourNum,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectCode: code,
            subjectName: subInfo.name || subInfo.subjectName || code,
            faculty: subInfo.faculty || '',
            facultyId: subInfo.facultyId || '',
            room: subInfo.classrooms || 'AB1',
            type: subInfo.ltp?.includes('P') ? 'PRACTICAL' : 'LECTURE',
            facultyCabin: subInfo.facultyCabin || null,
          });
        }
      });
    }
  });

  return {
    isConnected: true,
    lastSynced: account.lastSuccessfulSync,
    timetable: daysMap,
  };
}

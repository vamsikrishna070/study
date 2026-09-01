import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';
import SrmPortalAccount from '../../models/SrmPortalAccount.js';
import User from '../../models/User.js';
import Subject from '../../models/Subject.js';
import { decryptPortalSecret, encryptPortalSecret } from '../../utils/portalCrypto.js';
import { attemptSrmLogin, triggerBackgroundSync, findPortalAccountForUser } from './srmPortalService.js';
import {
  safeString,
  safeNumber,
  safeInt,
  safeHour,
  safeStatus,
  getHourTime,
  buildSubjectStats,
  computeOverall,
  buildTodayClassesFromCache,
} from '../../utils/srmPortalHelpers.js';

const BASE_URL = 'https://student.srmap.edu.in/srmapstudentcorner';
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
};

function parseAttendanceRow(tdList, $) {
  if (!tdList || tdList.length < 6) return null;
  const col0 = safeString($(tdList[0]).text());
  const col1 = safeString($(tdList[1]).text());
  const col2 = safeString($(tdList[2]).text());

  let code = '', name = '', condIdx = 2;
  if (/^\d+$/.test(col0) && col1 && col2) {
    code = col1;
    name = col2;
    condIdx = 3;
  } else {
    code = col0;
    name = col1;
    condIdx = 2;
  }

  if (!code || !name || /code|subject|conducted|s\.?no/i.test(code)) return null;

  const cond = safeInt($(tdList[condIdx]).text(), 0);
  const pres = safeInt($(tdList[condIdx + 1]).text(), 0);
  const abs = safeInt($(tdList[condIdx + 2]).text(), 0);
  const od = safeInt($(tdList[condIdx + 3]).text(), 0);

  let presPct = 0;
  if (tdList.length > condIdx + 4) presPct = safeNumber($(tdList[condIdx + 4]).text(), 0);

  let attPct = presPct;
  if (tdList.length > condIdx + 6) attPct = safeNumber($(tdList[condIdx + 6]).text(), presPct);

  return { code, name, cond, pres, abs, od, attPct, presPct };
}

export async function getActiveSession(account) {
  const existingSession = decryptPortalSecret(account.encryptedSessionId);
  if (existingSession) {
    try {
      const checkRes = await fetch(`${BASE_URL}/HRDSystem`, {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          'Cookie': `JSESSIONID=${existingSession}`,
        },
      });
      if (checkRes.ok) {
        const text = await checkRes.text();
        const isLoginPage =
          text.includes('StudentLoginToPortal') ||
          text.includes('txtUserName') ||
          text.includes('txtAuthKey') ||
          text.includes('StudentLoginPage');
        if (text && text.length > 200 && !isLoginPage) {
          return existingSession;
        }
      }
    } catch {

    }
  }

  const rawPassword = decryptPortalSecret(account.encryptedPassword);
  if (!rawPassword || !account.srmUsername) {
    account.connectionStatus = 'expired';
    await account.save();
    throw new Error('PORTAL_SESSION_EXPIRED');
  }

  console.log(`[PortalSession] Session expired or invalid. Attempting background re-login...`);
  const freshSession = await attemptSrmLogin(account.srmUsername, rawPassword);
  account.encryptedSessionId = encryptPortalSecret(freshSession);
  account.connectionStatus = 'connected';
  await account.save();

  return freshSession;
}

async function fetchTodayConduct(sessionId) {
  const response = await fetch(
    `${BASE_URL}/students/transaction/studentattendance.jsp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Cookie': `JSESSIONID=${sessionId}`,
      },
      body: new URLSearchParams({ ids: '33' }),
    }
  );

  if (!response.ok) {
    console.warn(`[fetchTodayConduct] studentattendance.jsp returned status ${response.status}`);
    return null;
  }

  const text = await response.text();
  const $ = cheerio.load(text);
  const records = [];

  $('div.container-fluid').each((_, container) => {
    const title = safeString($(container).find('div.row div').first().text());
    if (!title.includes('Today Attendance')) return;

    $(container)
      .find('div.row')
      .slice(2)
      .each((_, row) => {
        const cols = $(row)
          .find('div')
          .map((_, col) => safeString($(col).text()))
          .get();

        if (cols.length >= 4) {
          let date = '', day = '', hourRaw = '', subjectRaw = '', statusRaw = '';
          if (cols.length >= 5) {
            [date, day, hourRaw, subjectRaw, statusRaw] = cols;
          } else {
            [day, hourRaw, subjectRaw, statusRaw] = cols;
          }

          const parsedHour = safeHour(hourRaw);
          if (!parsedHour) return;

          const normStatus = safeStatus(statusRaw);

          records.push({
            date: safeString(date),
            day: safeString(day),
            hour: parsedHour,
            subjectCode: safeString(subjectRaw),
            subjectName: safeString(subjectRaw),
            status: normStatus,
          });
        }
      });
  });

  return records;
}

export async function getCurrentAttendance(userId) {
  const user = typeof userId === 'object' && userId._id ? userId : await User.findById(userId);
  const targetUserId = user?._id || userId;
  const account = await findPortalAccountForUser(user || targetUserId);

  if (!account) {
    return {
      isConnected: false,
      cached: false,
      dayOrder: null,
      date: DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd'),
      attendance: [],
      subjectStats: [],
      overallAttendance: { conducted: 0, present: 0, absent: 0, odMl: 0, percentage: 0, status: 'NOT_CONNECTED' },
      lastSynced: null,
    };
  }

  const cachedStats = buildSubjectStats(account.attendanceCache || []);
  const overall = computeOverall(cachedStats);
  const todayClasses = buildTodayClassesFromCache(account);

  const lastSyncTime = account.lastSuccessfulSync ? new Date(account.lastSuccessfulSync).getTime() : 0;
  const isStale = (Date.now() - lastSyncTime > 15 * 60 * 1000) || cachedStats.length === 0;

  if (isStale && account.connectionStatus === 'connected') {
    triggerBackgroundSync(targetUserId);
  }

  return {
    isConnected: true,
    cached: true,
    dayOrder: account.profileCache?.dayOrder || null,
    date: DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd'),
    attendance: todayClasses,
    subjectStats: cachedStats,
    overallAttendance: overall,
    lastSynced: account.lastSuccessfulSync,
  };
}

export async function submitAttendanceCode(userId, attendanceCode) {
  if (!attendanceCode || typeof attendanceCode !== 'string') {
    return { success: false, code: 'INVALID_CODE', message: 'The attendance code is invalid or has expired.' };
  }

  const cleanCode = attendanceCode.trim().toUpperCase();
  if (cleanCode.length < 3 || cleanCode.length > 15) {
    return { success: false, code: 'INVALID_CODE', message: 'The attendance code is invalid or has expired.' };
  }

  const account = await SrmPortalAccount.findOne({ userId }).select('+encryptedPassword +encryptedSessionId');

  if (!account) {
    return { success: false, code: 'NOT_CONNECTED', message: 'SRM Portal account is not connected.' };
  }

  let sessionId;
  try {
    sessionId = await getActiveSession(account);
  } catch (sessionErr) {
    console.error(`[submitAttendanceCode] Session error: ${sessionErr.message}`);
    return {
      success: false,
      code: 'PORTAL_SESSION_EXPIRED',
      message: 'Your SRM Portal session has expired. Please re-enter your credentials.',
    };
  }

  try {
    const response = await fetch(`${BASE_URL}/students/transaction/studentattendance.jsp`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `JSESSIONID=${sessionId}`,
        'Referer': `${BASE_URL}/students/transaction/studentattendance.jsp`,
      },
      body: new URLSearchParams({
        ids: '34',
        txtCode: cleanCode,
      }).toString(),
    });

    const responseText = await response.text();


    const $ = cheerio.load(responseText);
    const alertText = $('div.alert, .errorMessage, #divmsg, font[color="red"]').text().trim() || responseText;
    const lowerRes = responseText.toLowerCase();

    if (lowerRes.includes('invalid code') || lowerRes.includes('code expired') || lowerRes.includes('not active')) {
      return { success: false, code: 'INVALID_CODE', message: 'The attendance code entered is invalid or has expired.' };
    }
    if (lowerRes.includes('already marked') || lowerRes.includes('already present')) {
      return { success: true, code: 'ALREADY_MARKED', message: 'Attendance for this slot has already been recorded.' };
    }

    try {
      triggerBackgroundSync(userId);
    } catch {

    }

    return {
      success: true,
      code: 'ATTENDANCE_MARKED',
      message: 'Attendance code submitted successfully!',
      rawResponse: alertText.substring(0, 200),
    };
  } catch (postErr) {
    console.error(`[submitAttendanceCode] POST error: ${postErr.message}`);
    return { success: false, code: 'SUBMIT_FAILED', message: 'Could not connect to SRM portal to submit attendance code.' };
  }
}

export async function getTimetable(userId) {
  const account = await SrmPortalAccount.findOne({ userId });

  if (!account) {
    return {
      isConnected: false,
      lastSynced: null,
      timetable: {},
    };
  }

  let rawTimetable = [];
  if (Array.isArray(account.timetableCache)) {
    rawTimetable = account.timetableCache;
  } else if (account.timetableCache && typeof account.timetableCache === 'object') {
    rawTimetable = Object.entries(account.timetableCache).map(([day, slots]) => ({
      day,
      subjects: Array.isArray(slots) ? slots.map((s) => (typeof s === 'string' ? s : (s?.subjectCode || s?.code || '-'))) : [],
    }));
  }

  const rawSubjects = Array.isArray(account.subjectsCache)
    ? account.subjectsCache
    : (account.subjectsCache && typeof account.subjectsCache === 'object' ? Object.values(account.subjectsCache) : []);

  const subjectMap = new Map();
  const normalizeCode = (c) => safeString(c).toUpperCase();
  rawSubjects.forEach((sub) => {
    if (sub && sub.code) {
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
    const dayKey = safeString(row?.day).toLowerCase();
    if (daysMap[dayKey] !== undefined && Array.isArray(row.subjects)) {
      row.subjects.forEach((code, idx) => {
        const hourNum = idx + 1;
        const cleanCode = safeString(code);

        if (!cleanCode || cleanCode === '-' || cleanCode === 'NIL') return;

        const slot = getHourTime(hourNum);
        const norm = normalizeCode(cleanCode);
        const subInfo = subjectMap.get(cleanCode) || subjectMap.get(norm) || {};

        daysMap[dayKey].push({
          hour: hourNum,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subjectCode: cleanCode,
          subjectName: safeString(subInfo.name || subInfo.subjectName || cleanCode),
          faculty: safeString(subInfo.faculty),
          facultyId: safeString(subInfo.facultyId),
          room: safeString(subInfo.classrooms),
          type: subInfo.ltp?.includes('P') ? 'PRACTICAL' : 'LECTURE',
          facultyCabin: subInfo.facultyCabin || null,
        });
      });
    }
  });

  return {
    isConnected: true,
    lastSynced: account.lastSuccessfulSync,
    timetable: daysMap,
  };
}

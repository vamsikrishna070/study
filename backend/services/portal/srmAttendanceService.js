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

  if (!account || account.connectionStatus === 'disconnected') {
    return {
      isConnected: false,
      isVerified: false,
      isSessionExpired: false,
      connectionStatus: 'disconnected',
      connectionMessage: 'Portal connection required',
      cached: false,
      dayOrder: null,
      date: DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd'),
      attendance: [],
      subjectStats: [],
      overallAttendance: { conducted: 0, present: 0, absent: 0, odMl: 0, percentage: 0, status: 'NOT_CONNECTED' },
      lastSynced: null,
    };
  }

  const isConnected = account.connectionStatus === 'connected';
  const isSessionExpired = account.connectionStatus === 'expired';

  const cachedStats = buildSubjectStats(account.attendanceCache || []);
  const overall = computeOverall(cachedStats);
  const todayClasses = buildTodayClassesFromCache(account);

  const lastSyncTime = account.lastSuccessfulSync ? new Date(account.lastSuccessfulSync).getTime() : 0;
  const isStale = (Date.now() - lastSyncTime > 15 * 60 * 1000) || cachedStats.length === 0;

  if (isStale && isConnected) {
    triggerBackgroundSync(targetUserId);
  }

  return {
    isConnected: isConnected,
    isVerified: isConnected,
    connectionStatus: account.connectionStatus || 'disconnected',
    isSessionExpired: isSessionExpired,
    connectionMessage: isConnected
      ? 'Connected and verified'
      : (isSessionExpired ? 'Connection expired. Please reconnect.' : 'Portal connection required'),
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
    return { success: false, code: 'INVALID_CODE', message: 'Please enter a valid attendance code.' };
  }

  const cleanCode = attendanceCode.trim().toUpperCase();
  if (cleanCode.length < 3 || cleanCode.length > 15) {
    return { success: false, code: 'INVALID_CODE', message: 'The attendance code is invalid or has expired.' };
  }

  const account = await SrmPortalAccount.findOne({ userId }).select('+encryptedPassword +encryptedSessionId');

  if (!account || account.connectionStatus === 'disconnected') {
    return {
      success: false,
      code: 'NOT_CONNECTED',
      message: 'Portal connection required. Please connect your SRM AP account first.',
    };
  }

  let sessionId;
  try {
    sessionId = await getActiveSession(account);
  } catch (sessionErr) {
    console.error(`[submitAttendanceCode] Session error: ${sessionErr.message}`);
    account.connectionStatus = 'expired';
    await account.save().catch(() => {});
    return {
      success: false,
      code: 'PORTAL_SESSION_EXPIRED',
      message: 'Your portal session expired. Please reconnect.',
    };
  }

  const SUBMIT_URL = `${BASE_URL}/students/transaction/studentattendanceresources.jsp`;
  const postData = new URLSearchParams({
    acode: cleanCode,
    dynamiclatdata: '0',
    dynamiclonxdata: '0',
    ids: '1',
  });

  const sendRequest = async (sid) => {
    return await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `JSESSIONID=${sid}`,
      },
      body: postData,
    });
  };

  try {
    let response = await sendRequest(sessionId);
    let text = await response.text();


    const isLoginPage =
      text.includes('StudentLoginToPortal') ||
      text.includes('txtUserName') ||
      text.includes('txtAuthKey') ||
      text.includes('StudentLoginPage');

    if (isLoginPage) {
      console.log('[submitAttendanceCode] Session expired during submission, attempting re-login...');
      try {
        const rawPassword = decryptPortalSecret(account.encryptedPassword);
        if (rawPassword && account.srmUsername) {
          sessionId = await attemptSrmLogin(account.srmUsername, rawPassword);
          account.encryptedSessionId = encryptPortalSecret(sessionId);
          account.connectionStatus = 'connected';
          await account.save();

          response = await sendRequest(sessionId);
          text = await response.text();
        }
      } catch (reAuthErr) {
        console.error('[submitAttendanceCode] Re-authentication failed:', reAuthErr.message);
        account.connectionStatus = 'expired';
        await account.save().catch(() => {});
        return {
          success: false,
          code: 'PORTAL_SESSION_EXPIRED',
          message: 'Your portal session expired. Please reconnect.',
        };
      }
    }

    let responseData;
    try {
      responseData = JSON.parse(text.trim());
    } catch {
      try {
        const jsonString = text.replace(/<[^>]+>/g, '').trim();
        responseData = JSON.parse(jsonString);
      } catch (parseErr) {
        console.warn('[submitAttendanceCode] Non-JSON response from portal:', text.substring(0, 150));
      }
    }

    if (responseData) {
      const resultstatus = String(responseData.resultstatus || '');
      const resultMsg = typeof responseData.result === 'string' ? responseData.result : '';

      if (resultstatus === '1') {
        try {
          triggerBackgroundSync(userId);
        } catch {}
        return {
          success: true,
          code: 'ATTENDANCE_MARKED',
          message: 'Attendance Captured Successfully!',
          data: responseData,
        };
      } else if (resultMsg.includes('Your Attendance captured al')) {
        return {
          success: true,
          code: 'ALREADY_MARKED',
          message: 'Attendance Captured Already!',
          data: responseData,
        };
      } else if (resultMsg.includes('You have entered the Wrong Attendance')) {
        return {
          success: false,
          code: 'WRONG_CODE',
          message: 'Wrong Attendance Code!',
          data: responseData,
        };
      } else if (resultMsg) {
        return {
          success: false,
          code: 'INCORRECT_CODE',
          message: resultMsg,
          data: responseData,
        };
      } else {
        return {
          success: false,
          code: 'INCORRECT_CODE',
          message: 'Incorrect Attendance Code!',
          data: responseData,
        };
      }
    }


    const lowerRes = text.toLowerCase();
    if (lowerRes.includes('invalid code') || lowerRes.includes('code expired') || lowerRes.includes('wrong attendance')) {
      return { success: false, code: 'INVALID_CODE', message: 'Wrong Attendance Code!' };
    }
    if (lowerRes.includes('already captured') || lowerRes.includes('already marked') || lowerRes.includes('already present')) {
      return { success: true, code: 'ALREADY_MARKED', message: 'Attendance Captured Already!' };
    }

    return {
      success: false,
      code: 'SUBMIT_FAILED',
      message: 'Could not verify attendance with SRM Portal. Please try again.',
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

export function computePlannerMetrics(subject) {
  const conducted = safeInt(subject.conducted ?? subject.classes_conducted, 0);
  const present = safeInt(subject.present, 0);
  const absent = safeInt(subject.absent, 0);
  const odMl = safeInt(subject.odMl ?? subject.od_ml_taken, 0);
  const odMlPct = safeNumber(subject.odMlPercentage ?? subject.od_ml_percentage ?? subject.od_ml_percent, 0);
  const odMlRate = odMlPct / 100;

  const currentEffective = present + (odMlRate * conducted);
  const currentPercentage = conducted === 0 ? 0 : parseFloat(((currentEffective / conducted) * 100).toFixed(2));

  const remaining = Math.floor((0.25 * conducted - (conducted - currentEffective)) / 0.75);
  const safeBunks = remaining > 0 ? remaining : 0;

  let classesNeeded = 0;
  if (currentPercentage < 75 && conducted > 0) {
    const needed = Math.ceil((0.75 * conducted - currentEffective) / (0.25 + odMlRate));
    classesNeeded = needed > 0 ? needed : 0;
  }

  let riskLevel = 'SAFE';
  if (currentPercentage < 75) {
    riskLevel = 'CRITICAL';
  } else if (currentPercentage < 80) {
    riskLevel = 'CAUTION';
  }

  return {
    subjectCode: safeString(subject.subjectCode || subject.subject_code),
    subjectName: safeString(subject.subjectName || subject.subject_name),
    conducted,
    present,
    absent,
    odMl,
    odMlPercentage: odMlPct,
    percentage: currentPercentage,
    safeBunks,
    classesNeeded,
    riskLevel,
  };
}

export async function getAttendancePlannerData(userId) {
  const account = await SrmPortalAccount.findOne({ userId });

  if (!account || account.connectionStatus === 'disconnected') {
    return {
      isConnected: false,
      isVerified: false,
      connectionStatus: 'disconnected',
      connectionMessage: 'Portal connection required. Please connect your SRM AP account first.',
      subjects: [],
      summary: {
        totalSubjects: 0,
        safeSubjectsCount: 0,
        cautionSubjectsCount: 0,
        criticalSubjectsCount: 0,
        totalSafeBunks: 0,
        totalClassesNeeded: 0,
        overallPercentage: 0,
      },
      lastSynced: null,
    };
  }

  const isConnected = account.connectionStatus === 'connected';
  const isSessionExpired = account.connectionStatus === 'expired';

  const rawCache = Array.isArray(account.attendanceCache) ? account.attendanceCache : [];
  const subjects = rawCache.map((sub) => computePlannerMetrics(sub)).filter((s) => s.subjectCode);

  let totalSafeBunks = 0;
  let totalClassesNeeded = 0;
  let safeCount = 0;
  let cautionCount = 0;
  let criticalCount = 0;
  let totalConducted = 0;
  let totalPresent = 0;
  let totalOdMl = 0;

  subjects.forEach((s) => {
    totalSafeBunks += s.safeBunks;
    totalClassesNeeded += s.classesNeeded;
    totalConducted += s.conducted;
    totalPresent += s.present;
    totalOdMl += s.odMl;

    if (s.riskLevel === 'CRITICAL') criticalCount++;
    else if (s.riskLevel === 'CAUTION') cautionCount++;
    else safeCount++;
  });

  const overallEffective = totalPresent + totalOdMl;
  const overallPercentage = totalConducted > 0
    ? parseFloat(((overallEffective / totalConducted) * 100).toFixed(2))
    : 0;

  const summary = {
    totalSubjects: subjects.length,
    safeSubjectsCount: safeCount,
    cautionSubjectsCount: cautionCount,
    criticalSubjectsCount: criticalCount,
    totalSafeBunks,
    totalClassesNeeded,
    overallPercentage,
  };

  return {
    isConnected,
    isVerified: isConnected,
    connectionStatus: account.connectionStatus || 'disconnected',
    isSessionExpired,
    connectionMessage: isConnected
      ? 'Connected and verified'
      : (isSessionExpired ? 'Connection expired. Please reconnect.' : 'Portal connection required'),
    subjects,
    summary,
    lastSynced: account.lastSuccessfulSync,
  };
}


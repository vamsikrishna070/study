import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';
import { createWorker } from 'tesseract.js';
import mongoose from 'mongoose';
import SrmPortalAccount from '../../models/SrmPortalAccount.js';
import User from '../../models/User.js';
import Subject from '../../models/Subject.js';
import { encryptPortalSecret, decryptPortalSecret } from '../../utils/portalCrypto.js';
import { getActiveSession } from './srmAttendanceService.js';
import {
  safeString,
  safeNumber,
  safeInt,
  safeHour,
  safeStatus,
  buildSubjectStats,
  computeOverall,
  buildTodayClassesFromCache,
} from '../../utils/srmPortalHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.join(__dirname, '../../static');

let facultyCabinMap = new Map();
try {
  const facultyPath = path.join(staticDir, 'faculty.json');
  if (fs.existsSync(facultyPath)) {
    const facultyData = JSON.parse(fs.readFileSync(facultyPath, 'utf8'));
    const normalizeName = (name) => safeString(name)
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/\b(dr|mr|mrs|ms|prof)\b/g, "")
      .replace(/\b[a-z]{2,}\d{2,}\b/g, "")
      .replace(/\./g, "")
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    for (const row of facultyData) {
      if (row.faculty && row.location) {
        facultyCabinMap.set(normalizeName(row.faculty), row.location);
      }
    }
  }
} catch (err) {
  console.error('[PortalService] Error loading faculty.json:', err.message);
}

const getFacultyCabin = (name) => {
  const norm = safeString(name)
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(dr|mr|mrs|ms|prof)\b/g, "")
    .replace(/\b[a-z]{2,}\d{2,}\b/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return facultyCabinMap.get(norm) || null;
};

const BASE_URL = 'https://student.srmap.edu.in/srmapstudentcorner';
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive',
};

function splitPair(raw) {
  if (!raw) return { left: null, right: null };
  const str = safeString(raw);
  const parts = str.split('/');
  if (parts.length === 1) {
    return { left: parts[0].trim() || null, right: null };
  }
  return { left: parts[0].trim() || null, right: parts[1].trim() || null };
}

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

export async function findPortalAccountForUser(userOrId) {
  if (!userOrId) return null;
  let userObj = null;
  let userId = null;

  if (typeof userOrId === 'object' && userOrId._id) {
    userObj = userOrId;
    userId = userOrId._id;
  } else if (mongoose.Types.ObjectId.isValid(userOrId)) {
    userId = userOrId;
    userObj = await User.findById(userId);
  }

  if (!userId) return null;

  let account = await SrmPortalAccount.findOne({ userId }).select('+encryptedPassword +encryptedSessionId');

  if (!account && userObj && userObj.registrationNumber) {
    const cleanReg = safeString(userObj.registrationNumber).toUpperCase();
    if (cleanReg) {
      const orphanAccount = await SrmPortalAccount.findOne({ srmUsername: cleanReg }).select('+encryptedPassword +encryptedSessionId');
      if (orphanAccount) {
        orphanAccount.userId = userId;
        await orphanAccount.save();
        account = orphanAccount;
      }
    }
  }

  if (account) {
    try {
      const duplicates = await SrmPortalAccount.find({
        _id: { $ne: account._id },
        userId: account.userId
      });
      if (duplicates.length > 0) {
        await SrmPortalAccount.deleteMany({ _id: { $in: duplicates.map(d => d._id) } });
      }
    } catch (dupErr) {
      console.warn('[PORTAL LOOKUP] Duplicate cleanup warning:', dupErr.message);
    }
  }

  return account;
}

async function fetchSrmSession() {
  const loginPageRes = await fetch(`${BASE_URL}/StudentLoginPage`, {
    method: 'GET',
    headers: DEFAULT_HEADERS,
  });

  if (!loginPageRes.ok) {
    throw new Error('SRM Student Portal is currently unreachable. Please try again later.');
  }

  const setCookie = loginPageRes.headers.get('set-cookie') || '';
  const jsessionIdMatch = setCookie.match(/JSESSIONID=([^;]+)/);
  if (!jsessionIdMatch) {
    throw new Error('Could not establish session with SRM Portal.');
  }
  const jsessionId = jsessionIdMatch[1];

  const captchaRes = await fetch(`${BASE_URL}/captchas`, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'Cookie': `JSESSIONID=${jsessionId}`,
      'Referer': `${BASE_URL}/StudentLoginPage`,
    },
  });

  if (!captchaRes.ok) {
    throw new Error('Failed to fetch CAPTCHA from SRM portal.');
  }

  const arrayBuffer = await captchaRes.arrayBuffer();
  const captchaBuffer = Buffer.from(arrayBuffer);
  return { jsessionId, captchaBuffer };
}

async function solveCaptchaOcr(imageBuffer) {
  const worker = await createWorker('eng', 1, {
    logger: () => {},
    errorHandler: () => {},
  });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      tessedit_pageseg_mode: '8',
    });
    const { data } = await worker.recognize(imageBuffer);
    return safeString(data.text).replace(/\s+/g, '');
  } finally {
    await worker.terminate();
  }
}

export async function attemptSrmLogin(username, password) {
  console.log(`[SRM LOGIN] SRM Portal login started`);
  const MAX_RETRIES = 3;
  let lastErrorReason = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let jsessionId;
    let captchaBuffer;
    try {
      ({ jsessionId, captchaBuffer } = await fetchSrmSession());
    } catch (err) {
      console.warn(`[PortalService] Attempt ${attempt}: Unable to fetch SRM session/captcha:`, err.message);
      const networkError = new Error('SRM Student Portal is currently unreachable. Please try again later.');
      networkError.code = 'PORTAL_UNAVAILABLE';
      throw networkError;
    }

    let captchaText = '';
    try {
      captchaText = await solveCaptchaOcr(captchaBuffer);
    } catch (ocrErr) {
      console.warn(`[PortalService] Attempt ${attempt}: OCR recognition error. Retrying...`);
      continue;
    }

    if (!captchaText || captchaText.length < 3) {
      console.warn(`[PortalService] Attempt ${attempt}: OCR returned short text (${captchaText}). Retrying...`);
      continue;
    }

    const payload = new URLSearchParams({
      UserName: username,
      txtUserName: username,
      AuthKey: password,
      txtAuthKey: password,
      ccode: captchaText,
    });

    let loginRes;
    try {
      loginRes = await fetch(`${BASE_URL}/StudentLoginToPortal`, {
        method: 'POST',
        headers: {
          ...DEFAULT_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': `JSESSIONID=${jsessionId}`,
          'Origin': 'https://student.srmap.edu.in',
          'Referer': `${BASE_URL}/StudentLoginPage`,
        },
        body: payload.toString(),
      });
    } catch (networkErr) {
      console.warn(`[PortalService] Attempt ${attempt}: Network failure during login POST:`, networkErr.message);
      const netErr = new Error('Unable to reach the SRM AP portal. Please check your internet connection.');
      netErr.code = 'PORTAL_UNAVAILABLE';
      throw netErr;
    }

    const html = await loginRes.text();
    const setCookieHeader = loginRes.headers.get('set-cookie') || '';
    const newJsessionIdMatch = setCookieHeader.match(/JSESSIONID=([^;]+)/);
    const finalSessionId = newJsessionIdMatch ? newJsessionIdMatch[1] : jsessionId;

    const nameMatch = html.match(/<h2>(.*?)<\/h2>/i);
    const isLoginPage = html.includes('txtUserName') || html.includes('txtAuthKey');
    const isSuccess = !isLoginPage && (Boolean(nameMatch) || /HRDSystem|tblSubjectWiseAttendance|Welcome|Logout|profile_pic/i.test(html));
    if (isSuccess) {
      console.log(`[SRM LOGIN] SRM Portal login succeeded`);
      return finalSessionId;
    }

    const lowerHtml = html.toLowerCase();
    const isExplicitCredentialError =
      lowerHtml.includes('invalid user name') ||
      lowerHtml.includes('invalid password') ||
      lowerHtml.includes('invalid credentials') ||
      lowerHtml.includes('user name or password') ||
      lowerHtml.includes('wrong password') ||
      lowerHtml.includes('invalid registration');

    const isCaptchaError =
      lowerHtml.includes('invalid captcha') ||
      lowerHtml.includes('invalid verification') ||
      lowerHtml.includes('captcha code') ||
      lowerHtml.includes('verification code');

    if (isExplicitCredentialError) {
      console.warn(`[PortalService] Attempt ${attempt}: Credentials explicitly rejected by SRM AP portal.`);
      const credErr = new Error('Registration number or portal password is incorrect.');
      credErr.code = 'INVALID_CREDENTIALS';
      throw credErr;
    }

    if (isCaptchaError) {
      console.warn(`[PortalService] Attempt ${attempt}: CAPTCHA misread by OCR. Retrying...`);
      lastErrorReason = 'CAPTCHA_MISMATCH';
      continue;
    }

    console.warn(`[PortalService] Attempt ${attempt}: Login response unrecognized. Retrying...`);
    lastErrorReason = 'UNRECOGNIZED_RESPONSE';
  }

  const err = new Error(
    lastErrorReason === 'CAPTCHA_MISMATCH'
      ? 'SRM Portal verification could not be completed after 3 attempts. Please try again.'
      : 'Unable to authenticate with SRM AP Portal after multiple attempts. Please try again.'
  );
  err.code = lastErrorReason === 'CAPTCHA_MISMATCH' ? 'CAPTCHA_FAILED' : 'LOGIN_FAILED';
  throw err;
}

export async function connectPortalAccount(userId, srmUsername, srmPassword) {
  console.log(`[PORTAL CONNECT] Portal connection started`);
  if (!srmUsername || !srmPassword) {
    const err = new Error('Registration Number and Password are required.');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const cleanUsername = safeString(srmUsername).toUpperCase();
  const jsessionId = await attemptSrmLogin(cleanUsername, srmPassword);

  const encryptedPassword = encryptPortalSecret(srmPassword);
  const encryptedSessionId = encryptPortalSecret(jsessionId);
  const sessionTime = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd, HH:mm:ss');

  let account = await SrmPortalAccount.findOne({ srmUsername: cleanUsername }).select('+encryptedPassword +encryptedSessionId');

  if (!account) {
    const oldUserAccount = await SrmPortalAccount.findOne({ userId, srmUsername: { $ne: cleanUsername } });
    if (oldUserAccount) {
      console.log(`[PORTAL CONNECT] Unlinking old SRM account`);
      await SrmPortalAccount.deleteOne({ _id: oldUserAccount._id });
      await Subject.deleteMany({ user: userId, isSrmManaged: true });
    }

    account = new SrmPortalAccount({
      userId,
      srmUsername: cleanUsername,
      encryptedPassword,
      encryptedSessionId,
      sessionTime,
      connectionStatus: 'connected',
    });
  } else {
    if (String(account.userId) !== String(userId)) {
      console.log(`[PORTAL CONNECT] Re-assigning SRM account`);
      account.userId = userId;
    }
    account.encryptedPassword = encryptedPassword;
    account.encryptedSessionId = encryptedSessionId;
    account.sessionTime = sessionTime;
    account.connectionStatus = 'connected';
  }

  await account.save();

  try {
    await SrmPortalAccount.deleteMany({
      _id: { $ne: account._id },
      userId: account.userId
    });
  } catch (dupErr) {
    console.warn('[PORTAL CONNECT] Duplicate cleanup warning:', dupErr.message);
  }

  const user = await User.findById(userId);
  if (user) {
    let userUpdated = false;
    if (user.registrationNumber !== cleanUsername) {
      user.registrationNumber = cleanUsername;
      userUpdated = true;
    }
    if (user.university !== 'SRM University-AP') {
      user.university = 'SRM University-AP';
      userUpdated = true;
    }
    if (userUpdated) {
      await user.save();
    }
  }

  try {
    await scrapeAndStoreData(account, jsessionId);
  } catch (scrapeErr) {
    console.warn('[PortalService] Initial data scrape partial failure:', scrapeErr.message);
  }

  console.log(`[PORTAL CONNECT] Portal connection succeeded`);

  return {
    success: true,
    srmUsername: cleanUsername,
    registrationNumber: cleanUsername,
    connectionStatus: 'connected',
    lastSuccessfulSync: account.lastSuccessfulSync,
  };
}

async function scrapeAndStoreData(account, sessionId) {
  const postReport = (id, extraParams = {}) => {
    const params = new URLSearchParams({ ids: String(id), ...extraParams });
    return fetch(`${BASE_URL}/students/report/studentreportresources.jsp`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `JSESSIONID=${sessionId}`,
        'Referer': `${BASE_URL}/HRDSystem`,
      },
      body: params.toString(),
    }).then((res) => res.text());
  };

  const postTransaction = (id, extraParams = {}) => {
    const params = new URLSearchParams({ ids: String(id), ...extraParams });
    return fetch(`${BASE_URL}/students/transaction/studentattendance.jsp`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': `JSESSIONID=${sessionId}`,
        'Referer': `${BASE_URL}/students/transaction/studentattendance.jsp`,
      },
      body: params.toString(),
    }).then((res) => res.text());
  };

  const postHrd = () =>
    fetch(`${BASE_URL}/HRDSystem`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Cookie': `JSESSIONID=${sessionId}`,
      },
    }).then((res) => res.text());

  try {
    const [htmlOriginal, htmlAttendance, htmlTimetable, htmlSubjects, htmlProfile, htmlCgpa, htmlInternals, htmlLedger, htmlTodayConduct] =
      await Promise.all([
        postHrd().catch(() => ''),
        postReport(3).catch(() => ''),
        postReport(10).catch(() => ''),
        postReport(2).catch(() => ''),
        postReport(1).catch(() => ''),
        postReport(6).catch(() => ''),
        postReport(5).catch(() => ''),
        postReport(6).catch(() => ''),
        postTransaction(33).catch(() => ''),
      ]);

    const $original = cheerio.load(htmlOriginal || '');
    const $attendance = cheerio.load(htmlAttendance || '');
    const $timetable = cheerio.load(htmlTimetable || '');
    const $subjects = cheerio.load(htmlSubjects || '');
    const $profile = cheerio.load(htmlProfile || '');
    const $cgpa = cheerio.load(htmlCgpa || '');
    const $internals = cheerio.load(htmlInternals || '');
    const $ledger = cheerio.load(htmlLedger || '');
    const $todayConduct = cheerio.load(htmlTodayConduct || '');

    const profile = {};
    $profile("table.table-striped tr").each((_, row) => {
      const td = $profile(row).find("td");
      if (td.length === 3) {
        const key = safeString(td.eq(0).text());
        const val = safeString(td.eq(2).text());
        if (/Student Name/i.test(key)) profile.studentName = val;
        else if (/Register No/i.test(key)) profile.registerNo = val;
        else if (/Institution/i.test(key)) profile.institution = val;
        else if (/Semester/i.test(key)) profile.semester = val;
        else if (/Program \/ Section/i.test(key)) {
          const parts = val.split("/").map((v) => safeString(v));
          profile.program = parts[0] || '';
          profile.section = (parts[1] || '').replace(/['"]+/g, "");
        } else if (/Specialization/i.test(key)) profile.specialization = val;
        else if (/D\.O\.B\. \/ Gender/i.test(key)) {
          const parts = val.split("/").map((v) => safeString(v));
          profile.dob = parts[0] || '';
          profile.gender = parts[1] || '';
        }
      }
    });
    const pic = $original("div.profile_pic img").attr("src");
    if (pic) profile.picture = `https://student.srmap.edu.in${pic}`;

    const cgpaDiv = $cgpa("div[style*='float: right'][style*='font-size']");
    const rawCgpaText = cgpaDiv.length ? safeString(cgpaDiv.text()) : '';
    const cgpaVal = rawCgpaText.includes(':') ? safeString(rawCgpaText.split(':')[1]) : '0';
    const cgpa = { cgpa: cgpaVal || '0' };

    const normalizeCode = (c) => safeString(typeof c === 'string' ? c : (c?.subjectCode || c?.code || '')).replace(/\s+/g, ' ').toUpperCase();

    const subjectMap = {};
    $subjects("table tr").each((_, row) => {
      const td = $subjects(row).find("td");
      if (td.length >= 4) {
        const sem = safeString(td.eq(0).text());
        const code = safeString(td.eq(1).text());
        const name = safeString(td.eq(2).text());
        const credit = safeString(td.eq(3).text());
        if (code && sem && !/code|semester/i.test(code)) {
          subjectMap[normalizeCode(code)] = { code, name, semester: sem, credit };
        }
      }
    });

    const attendance = [];
    const attendanceSubjectsMap = new Map();
    const activeCodesSet = new Set();
    let totalConducted = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalOdMl = 0;

    $attendance("table#tblSubjectWiseAttendance tr").each((_, row) => {
      const tdList = $attendance(row).find("td").toArray();
      const parsed = parseAttendanceRow(tdList, $attendance);
      if (parsed) {
        const { code, name, cond, pres, abs, od, attPct, presPct } = parsed;
        const normCode = normalizeCode(code);
        activeCodesSet.add(normCode);
        attendanceSubjectsMap.set(normCode, { code, name });

        totalConducted += cond;
        totalPresent += pres;
        totalAbsent += abs;
        totalOdMl += od;

        attendance.push({
          subjectCode: code,
          subjectName: name,
          conducted: cond,
          present: pres,
          absent: abs,
          odMl: od,
          percentage: attPct,
          subject_code: code,
          subject_name: name,
          classes_conducted: String(cond),
          od_ml_taken: String(od),
          present_percentage: String(presPct),
          od_ml_percentage: "0.00",
          attendance_percentage: String(attPct),
        });
      }
    });

    const overallPercentage = totalConducted > 0
      ? parseFloat((((totalPresent + totalOdMl) / totalConducted) * 100).toFixed(2))
      : 0;

    const overallAttendance = {
      conducted: totalConducted,
      present: totalPresent,
      absent: totalAbsent,
      odMl: totalOdMl,
      percentage: overallPercentage,
      status: overallPercentage >= 75 ? 'ELIGIBLE (≥75%)' : 'ATTENDANCE ALERT',
    };
    profile.overallAttendance = overallAttendance;

    const todayConductClasses = [];
    $todayConduct("div.container-fluid").each((_, container) => {
      const title = safeString($todayConduct(container).find("div.row div").first().text());
      if (!title.includes("Today Attendance")) return;

      $todayConduct(container)
        .find("div.row")
        .slice(2)
        .each((_, row) => {
          const cols = $todayConduct(row)
            .find("div")
            .map((_, col) => safeString($todayConduct(col).text()))
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

            todayConductClasses.push({
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

    account.todayAttendanceCache = todayConductClasses;

    const rawTimetable = [];
    $timetable("tr").each((_, row) => {
      const td = $timetable(row).find("td");
      if (td.length > 1) {
        rawTimetable.push({
          day: safeString(td.eq(0).text()),
          subjects: td.slice(1).map((_, el) => safeString($timetable(el).text())).get(),
        });
      }
    });

    const timetable = rawTimetable.filter((item) => /monday|tuesday|wednesday|thursday|friday|saturday|day/i.test(item.day)).slice(0, 6);

    const legendSubjectsMap = new Map();
    $timetable("tr").each((_, row) => {
      const td = $timetable(row).find("td");
      if (td.length >= 3) {
        const firstCol = safeString(td.eq(0).text());
        const secondCol = safeString(td.eq(1).text());

        if (/^[A-Z0-9\s]{3,15}$/i.test(firstCol) && !/day|s\.?no|code|hour|monday|tuesday|wednesday|thursday|friday|saturday/i.test(firstCol)) {
          const code = firstCol;
          const normCode = normalizeCode(code);
          const name = secondCol || attendanceSubjectsMap.get(normCode)?.name || subjectMap[normCode]?.name || code;
          const ltp = td.length >= 3 ? safeString(td.eq(2).text()) : '';
          const rawFaculty = td.length >= 4 ? safeString(td.eq(3).text()) : '';
          const classrooms = td.length >= 5 ? safeString(td.eq(4).text()) : '';

          const idMatch = rawFaculty.match(/\((?:id:?\s*)?(\d+)\)/i) || rawFaculty.match(/(\d{4,6})/);
          const facultyId = idMatch ? idMatch[1] : '';
          const faculty = rawFaculty.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();

          const cabinLocation = faculty ? getFacultyCabin(faculty) : null;

          legendSubjectsMap.set(normCode, {
            code,
            name,
            subjectCode: code,
            subjectName: name,
            ltp,
            credit: subjectMap[normCode]?.credit || '',
            semester: subjectMap[normCode]?.semester || profile.semester || '',
            faculty,
            facultyId,
            classrooms,
            facultyCabin: cabinLocation ? { name: faculty, location: cabinLocation } : null,
          });
        }
      }
    });

    const mergedSubjectsMap = new Map();

    legendSubjectsMap.forEach((sub, normCode) => {
      mergedSubjectsMap.set(normCode, sub);
    });

    attendanceSubjectsMap.forEach((info, normCode) => {
      if (!mergedSubjectsMap.has(normCode)) {
        mergedSubjectsMap.set(normCode, {
          code: info.code,
          name: info.name,
          subjectCode: info.code,
          subjectName: info.name,
          ltp: '',
          credit: subjectMap[normCode]?.credit || '',
          semester: subjectMap[normCode]?.semester || profile.semester || '',
          faculty: '',
          facultyId: '',
          classrooms: '',
          facultyCabin: null,
        });
      }
    });

    const blacklistKeywords = ['internship', 'photography', 'co-curricular', 'extra-curricular', 'community service', 'audit course'];
    const allScrapedSubjects = Array.from(mergedSubjectsMap.values());
    const activeSubjectDetails = [];

    allScrapedSubjects.forEach((sub) => {
      const normCode = normalizeCode(sub.code);
      const nameLower = safeString(sub.name).toLowerCase();
      const codeLower = safeString(sub.code).toLowerCase();

      const isBlacklisted = blacklistKeywords.some(kw => nameLower.includes(kw) || codeLower.includes(kw));

      if (isBlacklisted && !legendSubjectsMap.has(normCode)) {
        return;
      }

      const isActive = activeCodesSet.size > 0 ? activeCodesSet.has(normCode) : true;
      sub.isSrmActive = isActive;
      sub.isSrmManaged = true;
      if (isActive) {
        activeSubjectDetails.push(sub);
      }
    });

    const exams = [];
    $internals("table.table.table-striped.table-bordered > tbody > tr").each((i, row) => {
      const td = $internals(row).find("td");
      if (td.length === 4) {
        const subject_code = safeString(td.eq(0).text());
        const subject_name = safeString(td.eq(1).text());
        const raw_obtained = safeString(td.eq(2).text());
        const raw_max = safeString(td.eq(3).text());

        const isPublished = raw_obtained !== '' && raw_obtained !== '-' && raw_obtained !== 'N/A' && !/not published/i.test(raw_obtained);
        const marks_obtained = isPublished ? raw_obtained : null;
        const max_marks = isPublished ? raw_max : (raw_max || null);

        const detailRow = $internals(row).next("tr");
        const components = [];

        detailRow.find("table tr").each((j, drow) => {
          const dtd = $internals(drow).find("td");
          if (dtd.length === 3 && !dtd.eq(0).hasClass("ui-state-active")) {
            const compName = safeString(dtd.eq(0).text());
            const rawConducted = safeString(dtd.eq(1).text());
            const rawConverted = safeString(dtd.eq(2).text());

            const conducted = splitPair(rawConducted);
            const converted = splitPair(rawConverted);

            if (compName) {
              components.push({
                name: compName,
                conductedObtained: conducted.left,
                conductedMax: conducted.right,
                convertedObtained: converted.left,
                convertedMax: converted.right,
              });
            }
          }
        });

        exams.push({
          subject_code,
          subject_name,
          published: isPublished,
          marks_obtained,
          max_marks,
          components,
          source: 'srm_portal',
        });
      }
    });

    const results = [];
    $ledger("div.subTable table tr").each((_, row) => {
      const td = $ledger(row).find("td");
      if (td.length >= 9) {
        results.push({
          semester: safeString(td.eq(0).text()),
          month_year: safeString(td.eq(1).text()),
          subject_code: safeString(td.eq(2).text()),
          subject_description: safeString(td.eq(3).text()),
          credit: safeString(td.eq(4).text()),
          grade: safeString(td.eq(5).text()),
          grade_points: safeString(td.eq(6).text()),
          result: safeString(td.eq(7).text()),
          attempt: safeString(td.eq(8).text()),
          source: 'srm_portal',
        });
      }
    });

    if (Object.keys(profile).length > 0) account.profileCache = profile;
    if (cgpa.cgpa) account.cgpaCache = cgpa;
    if (attendance.length > 0) account.attendanceCache = attendance;
    if (timetable.length > 0) account.timetableCache = timetable;
    if (activeSubjectDetails.length > 0) account.subjectsCache = activeSubjectDetails;
    if (exams.length > 0) account.examsCache = exams;
    if (results.length > 0) account.resultsCache = results;
    account.lastSuccessfulSync = new Date();
    account.connectionStatus = 'connected';

    await account.save();

    if (account.userId) {
      const user = await User.findById(account.userId);
      if (user && profile && Object.keys(profile).length > 0) {
        let updated = false;
        if (profile.studentName) {
          if (user.officialName !== profile.studentName) {
            user.officialName = profile.studentName;
            updated = true;
          }
          if (!user.name || user.name === 'Student') {
            user.name = profile.studentName;
            updated = true;
          }
        }

        const regNoToSave = profile.registerNo || account.srmUsername;
        if (regNoToSave && user.registrationNumber !== regNoToSave) { user.registrationNumber = regNoToSave; updated = true; }

        if (profile.institution && user.university !== profile.institution) { user.university = profile.institution; updated = true; }
        if (profile.program && user.degree !== profile.program) { user.degree = profile.program; updated = true; }
        if (profile.specialization && user.branch !== profile.specialization) { user.branch = profile.specialization; updated = true; }
        if (profile.section && user.section !== profile.section) { user.section = profile.section; updated = true; }

        if (profile.semester) {
          const romanMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
          let semStr = safeString(profile.semester).toLowerCase().replace(/semester|sem/gi, '').trim();
          let semNum = parseInt(semStr, 10);
          if (isNaN(semNum) && romanMap[semStr]) semNum = romanMap[semStr];
          if (isNaN(semNum)) {
            const digitMatch = safeString(profile.semester).match(/\b([1-9]|1[0-2])\b/);
            if (digitMatch) semNum = parseInt(digitMatch[1], 10);
          }
          if (!isNaN(semNum) && semNum >= 1 && semNum <= 12) {
            if (user.semester !== semNum) {
              user.semester = semNum;
              updated = true;
            }
            profile.semester = `Semester ${semNum}`;
          }
        }

        if (updated) {
          await user.save();
        }
      }
    }

    try {
      if (allScrapedSubjects.length > 0 && account.userId) {
        for (const sub of allScrapedSubjects) {
          if (!sub.code || !sub.name) continue;

          const cleanCode = safeString(sub.code).toUpperCase();
          const cleanName = safeString(sub.name);
          const creditsNum = Math.min(Math.max(safeInt(sub.credit, 3), 1), 10);
          const semNum = Math.min(Math.max(safeInt(sub.semester, 1), 1), 12);

          let existingSubject = await Subject.findOne({ user: account.userId, code: cleanCode });
          if (!existingSubject) {
            existingSubject = await Subject.findOne({ user: account.userId, code: sub.code });
          }

          if (existingSubject) {
            let subjectUpdated = false;

            if (cleanName && existingSubject.name !== cleanName) {
              existingSubject.name = cleanName;
              subjectUpdated = true;
            }
            if (existingSubject.credits !== creditsNum) {
              existingSubject.credits = creditsNum;
              subjectUpdated = true;
            }
            if (sub.faculty && existingSubject.faculty !== safeString(sub.faculty)) {
              existingSubject.faculty = safeString(sub.faculty);
              subjectUpdated = true;
            }
            existingSubject.isSrmManaged = true;

            if (activeCodesSet.size > 0 && existingSubject.isSrmActive !== sub.isSrmActive) {
              existingSubject.isSrmActive = sub.isSrmActive;
              subjectUpdated = true;
            }

            if (subjectUpdated) {
              await existingSubject.save();
            }
          } else if (sub.isSrmActive !== false) {
            await Subject.create({
              user: account.userId,
              code: cleanCode,
              name: cleanName,
              credits: creditsNum,
              faculty: safeString(sub.faculty),
              semester: semNum,
              isSrmManaged: true,
              isSrmActive: true,
            });
          }
        }

        if (activeCodesSet.size > 0) {
          const userSrmSubjects = await Subject.find({ user: account.userId, isSrmManaged: true });
          for (const s of userSrmSubjects) {
            const norm = normalizeCode(s.code);
            if (!activeCodesSet.has(norm) && s.isSrmActive !== false) {
              s.isSrmActive = false;
              await s.save();
            }
          }
        }
      }
    } catch (subjectErr) {
      console.error('[SRM SYNC] Failed to reconcile subjects:', subjectErr.message);
    }

    return true;
  } catch (err) {
    console.error('[PortalService] Error scraping SRM portal data:', err.message);
    throw err;
  }
}

const activeSyncPromises = new Map();

export async function isAccountSyncing(userId) {
  const account = await SrmPortalAccount.findOne({ userId }).select('_id srmUsername');
  if (!account) return false;
  const accountKey = String(account._id);
  const usernameKey = account.srmUsername;
  return activeSyncPromises.has(accountKey) || (usernameKey && activeSyncPromises.has(usernameKey));
}

export async function triggerBackgroundSync(userId) {
  if (!userId) return null;
  const user = await User.findById(userId);
  const account = await findPortalAccountForUser(user || userId);
  if (!account || account.connectionStatus !== 'connected') return null;

  const accountKey = String(account._id);
  const usernameKey = account.srmUsername;

  if (activeSyncPromises.has(accountKey)) {
    console.log(`[PORTAL] Background sync already active. Sharing task.`);
    return activeSyncPromises.get(accountKey);
  }
  if (usernameKey && activeSyncPromises.has(usernameKey)) {
    console.log(`[PORTAL] Background sync already active. Sharing task.`);
    return activeSyncPromises.get(usernameKey);
  }

  const syncTask = (async () => {
    try {
      console.log(`[PORTAL SYNC] Sync started`);
      await reSyncPortalData(userId);
      console.log(`[PORTAL SYNC] Sync completed successfully`);
    } catch (err) {
      console.warn(`[PORTAL SYNC] Sync failed:`, err.message);
    } finally {
      activeSyncPromises.delete(accountKey);
      if (usernameKey) activeSyncPromises.delete(usernameKey);
    }
  })();

  activeSyncPromises.set(accountKey, syncTask);
  if (usernameKey) activeSyncPromises.set(usernameKey, syncTask);
  return syncTask;
}

export async function getPortalAccountData(userId) {
  const user = typeof userId === 'object' && userId._id ? userId : await User.findById(userId);
  const targetUserId = user?._id || userId;

  const account = await findPortalAccountForUser(user || targetUserId);

  if (!account) {
    return { isConnected: false, hasStoredPortalData: false };
  }

  let userSubjectsCount = 0;
  try {
    userSubjectsCount = await Subject.countDocuments({ user: targetUserId, isSrmActive: { $ne: false } });
  } catch (cntErr) {
    console.warn('[PortalService] Unable to count user subjects:', cntErr.message);
  }

  const cachedSubjectsCount = account.subjectsCache?.length || 0;
  const attendanceCount = account.attendanceCache?.length || 0;
  const totalEnrolledCount = Math.max(userSubjectsCount, cachedSubjectsCount, attendanceCount);

  const hasStoredData = Boolean(
    account.srmUsername ||
    (account.profileCache && Object.keys(account.profileCache).length > 0) ||
    totalEnrolledCount > 0
  );

  const subjectStats = buildSubjectStats(account.attendanceCache || []);
  const todayClasses = buildTodayClassesFromCache(account);
  const overallAttendance = computeOverall(subjectStats);

  const accountKey = String(account._id);
  const isSyncing = activeSyncPromises.has(accountKey) || (account.srmUsername && activeSyncPromises.has(account.srmUsername));

  const lastSyncTime = account.lastSuccessfulSync ? new Date(account.lastSuccessfulSync).getTime() : 0;
  const isStale = (Date.now() - lastSyncTime > 15 * 60 * 1000) || cachedSubjectsCount === 0 || attendanceCount === 0;

  if (isStale && account.connectionStatus === 'connected' && !isSyncing) {
    triggerBackgroundSync(targetUserId);
  }

  return {
    isConnected: true,
    hasStoredPortalData: hasStoredData,
    connectionStatus: account.connectionStatus || 'connected',
    isSessionExpired: account.connectionStatus === 'expired',
    isSyncing: Boolean(isSyncing),
    srmUsername: account.srmUsername,
    registrationNumber: account.srmUsername,
    lastSuccessfulSync: account.lastSuccessfulSync,
    source: 'srm_portal',
    profile: account.profileCache || {},
    cgpa: account.cgpaCache || { cgpa: '0' },
    attendance: todayClasses,
    subjectStats: subjectStats,
    overallAttendance: overallAttendance,
    timetable: account.timetableCache || [],
    subjects: account.subjectsCache || [],
    enrolledSubjectsCount: totalEnrolledCount,
    exams: account.examsCache || [],
    results: account.resultsCache || [],
  };
}

export async function reSyncPortalData(userId) {
  console.log(`[PORTAL SYNC] Sync started`);
  const user = await User.findById(userId);
  const account = await findPortalAccountForUser(user || userId);

  if (!account) {
    console.warn(`[PORTAL SYNC] Sync failed: Account not connected`);
    const err = new Error('SRM Portal account is not connected.');
    err.code = 'NOT_CONNECTED';
    throw err;
  }

  try {
    const sessionId = await getActiveSession(account);

    await scrapeAndStoreData(account, sessionId);
    account.connectionStatus = 'connected';
    account.lastSuccessfulSync = new Date();
    await account.save();

    console.log(`[PORTAL SYNC] Sync completed successfully`);
    return await getPortalAccountData(userId);
  } catch (err) {
    console.warn(`[PORTAL SYNC] Sync failed:`, err.message);
    if (err.message === 'PORTAL_SESSION_EXPIRED' || err.code === 'INVALID_CREDENTIALS') {
      account.connectionStatus = 'expired';
      await account.save().catch(() => {});
      throw err;
    }
    account.connectionStatus = 'expired';
    await account.save().catch(() => {});
    const data = await getPortalAccountData(userId);
    data.syncWarning = 'Live SRM session could not be refreshed. Showing your last synced data.';
    return data;
  }
}

export async function disconnectPortalAccount(userId) {
  console.log(`[PORTAL DISCONNECT] Unlinking SRM portal and clearing caches...`);
  await SrmPortalAccount.deleteMany({ userId });
  await Subject.deleteMany({ user: userId, isSrmManaged: true });

  const user = await User.findById(userId);
  if (user) {
    user.registrationNumber = '';
    user.officialName = '';
    await user.save();
  }

  return {
    success: true,
    message: 'SRM Portal disconnected successfully.',
  };
}

export function getAcademicCalendarData() {
  const calendarPath = path.join(staticDir, 'academic_calendar.json');
  if (fs.existsSync(calendarPath)) {
    return JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  }
  return {};
}

export function getLearningResourcesData(type, course, year, subjectId) {
  const resDir = path.join(staticDir, 'resources');

  const normalizeYear = (y) => {
    if (!y) return null;
    const m = String(y).match(/(\d+)/);
    return m ? m[1] : null;
  };

  if (type === 'courses') {
    const p = path.join(resDir, 'courses.json');
    if (!fs.existsSync(p)) return [];
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const yr = normalizeYear(year);

    const depts = new Map();
    for (const [y, deptMap] of Object.entries(raw)) {
      if (yr && y !== yr) continue;
      for (const [code, info] of Object.entries(deptMap || {})) {
        if (!depts.has(code)) depts.set(code, { code, name: info.name || code });
      }
    }
    return Array.from(depts.values()).sort((a, b) => a.code.localeCompare(b.code));
  }

  if (type === 'subjects') {
    const p = path.join(resDir, 'subjects.json');
    if (!fs.existsSync(p)) return [];
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const yr = normalizeYear(year);
    const dept = (course || '').toUpperCase();

    const results = [];
    for (const [deptKey, yearMap] of Object.entries(raw)) {
      if (dept && deptKey !== dept) continue;
      for (const [y, subjectList] of Object.entries(yearMap || {})) {
        if (yr && y !== yr) continue;
        for (const subj of (Array.isArray(subjectList) ? subjectList : [])) {
          results.push({ ...subj, department: deptKey, year: y });
        }
      }
    }
    return results;
  }

  if (type === 'resource') {
    const p = path.join(resDir, 'resource.json');
    if (!fs.existsSync(p)) return { previousYearPapers: { mid: [], sem: [] }, slidesAndNotes: [] };
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const yr = normalizeYear(year);
    const dept = (course || '').toUpperCase();
    const sid = String(subjectId || '');

    const deptData = raw[dept];
    if (!deptData) return { previousYearPapers: { mid: [], sem: [] }, slidesAndNotes: [] };
    const yearData = deptData[yr];
    if (!yearData) return { previousYearPapers: { mid: [], sem: [] }, slidesAndNotes: [] };
    const subjData = yearData[sid];
    if (!subjData) return { previousYearPapers: { mid: [], sem: [] }, slidesAndNotes: [] };

    return {
      previousYearPapers: {
        mid: Array.isArray(subjData.previousYearPapers?.mid) ? subjData.previousYearPapers.mid : [],
        sem: Array.isArray(subjData.previousYearPapers?.sem) ? subjData.previousYearPapers.sem : [],
      },
      slidesAndNotes: Array.isArray(subjData.slidesAndNotes) ? subjData.slidesAndNotes : [],
    };
  }

  return {};
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import { DateTime } from 'luxon';
import { createWorker } from 'tesseract.js';
import SrmPortalAccount from '../../models/SrmPortalAccount.js';
import User from '../../models/User.js';
import Subject from '../../models/Subject.js';
import { encryptPortalSecret, decryptPortalSecret } from '../../utils/portalCrypto.js';
import { getActiveSession } from './srmAttendanceService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.join(__dirname, '../../static');

// Load faculty cabins
let facultyCabinMap = new Map();
try {
  const facultyPath = path.join(staticDir, 'faculty.json');
  if (fs.existsSync(facultyPath)) {
    const facultyData = JSON.parse(fs.readFileSync(facultyPath, 'utf8'));
    const normalizeName = (name) => (name || '')
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
  const norm = (name || '')
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
  const parts = raw.split('/');
  if (parts.length === 1) {
    return { left: parts[0].trim() || null, right: null };
  }
  return { left: parts[0].trim() || null, right: parts[1].trim() || null };
}

// 1. Internal: Fetch a fresh SRM session (JSESSIONID) and download the CAPTCHA image bytes
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

// 2. Internal: Use Tesseract.js to OCR the CAPTCHA image and return the text
async function solveCaptchaOcr(imageBuffer) {
  const worker = await createWorker('eng', 1, {
    // Suppress verbose Tesseract logs
    logger: () => {},
    errorHandler: () => {},
  });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      tessedit_pageseg_mode: '8', // Treat as single word
    });
    const { data } = await worker.recognize(imageBuffer);
    return (data.text || '').replace(/\s+/g, '').trim();
  } finally {
    await worker.terminate();
  }
}

// 3. Internal: Attempt SRM login with a solved CAPTCHA — returns jsessionId on success
export async function attemptSrmLogin(username, password) {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let jsessionId;
    let captchaBuffer;
    try {
      ({ jsessionId, captchaBuffer } = await fetchSrmSession());
    } catch (err) {
      throw new Error('SRM Student Portal is currently unreachable. Please try again later.');
    }

    let captchaText = '';
    try {
      captchaText = await solveCaptchaOcr(captchaBuffer);
    } catch {
      // OCR failed — try again with a new session
      continue;
    }

    if (!captchaText || captchaText.length < 3) {
      // OCR returned too little — try again
      continue;
    }

    const payload = new URLSearchParams({
      txtUserName: username,
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
      throw new Error('Unable to reach the SRM AP portal. Please check your internet connection.');
    }

    const html = await loginRes.text();
    const nameMatch = html.match(/<h2>(.*?)<\/h2>/);
    if (nameMatch) {
      // Successful login
      return jsessionId;
    }

    // If credentials are clearly wrong (not a CAPTCHA issue), fail immediately
    if (/invalid|incorrect|wrong/i.test(html) && attempt >= 2) {
      throw new Error('Invalid SRM registration number or portal password. Please check your credentials and try again.');
    }
    // Otherwise retry (likely a CAPTCHA solve error)
  }

  throw new Error(
    'Unable to automatically authenticate with the SRM AP portal after multiple attempts. ' +
    'This may be a temporary portal issue. Please try again in a few minutes.'
  );
}

// 4. Connect user's SRM portal account — fully automatic, no CAPTCHA exposed to student
export async function connectPortalAccount(userId, srmUsername, srmPassword) {
  if (!srmUsername || !srmPassword) {
    throw new Error('Registration Number and Password are required.');
  }

  const cleanUsername = srmUsername.trim().toUpperCase();

  // Auto-authenticate: fetch session, solve CAPTCHA, login
  const jsessionId = await attemptSrmLogin(cleanUsername, srmPassword);

  const encryptedPassword = encryptPortalSecret(srmPassword);
  const encryptedSessionId = encryptPortalSecret(jsessionId);
  const sessionTime = DateTime.now().setZone('Asia/Kolkata').toFormat('yyyy-MM-dd, HH:mm:ss');

  let account = await SrmPortalAccount.findOne({ userId });
  if (!account) {
    account = new SrmPortalAccount({
      userId,
      srmUsername: cleanUsername,
      encryptedPassword,
      encryptedSessionId,
      sessionTime,
      connectionStatus: 'connected',
    });
  } else {
    account.srmUsername = cleanUsername;
    account.encryptedPassword = encryptedPassword;
    account.encryptedSessionId = encryptedSessionId;
    account.sessionTime = sessionTime;
    account.connectionStatus = 'connected';
  }

  await account.save();

  // Scrape and cache initial data
  await scrapeAndStoreData(account, jsessionId);

  return {
    success: true,
    srmUsername: cleanUsername,
    connectionStatus: 'connected',
    lastSuccessfulSync: account.lastSuccessfulSync,
  };
}

// 3. Helper to scrape SRM portal pages using session ID
async function scrapeAndStoreData(account, sessionId) {
  const postReport = (id, extraParams = {}) => {
    const params = new URLSearchParams({ ids: String(id), ...extraParams });
    return fetch(`${BASE_URL}/students/report/studentreportresources.jsp`, {
      method: 'POST',
      headers: {
        ...DEFAULT_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `JSESSIONID=${sessionId}`,
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
    const [htmlOriginal, htmlAttendance, htmlTimetable, htmlSubjects, htmlProfile, htmlCgpa, htmlInternals, htmlLedger] =
      await Promise.all([
        postHrd().catch(() => ''),
        postReport(3).catch(() => ''),
        postReport(10).catch(() => ''),
        postReport(2).catch(() => ''),
        postReport(1).catch(() => ''),
        postReport(6).catch(() => ''),
        postReport(5).catch(() => ''),
        postReport(6).catch(() => ''),
      ]);

    const $original = cheerio.load(htmlOriginal);
    const $attendance = cheerio.load(htmlAttendance);
    const $timetable = cheerio.load(htmlTimetable);
    const $subjects = cheerio.load(htmlSubjects);
    const $profile = cheerio.load(htmlProfile);
    const $cgpa = cheerio.load(htmlCgpa);
    const $internals = cheerio.load(htmlInternals);
    const $ledger = cheerio.load(htmlLedger);

    // Profile
    const profile = {};
    $profile("table.table-striped tr").each((_, row) => {
      const td = $profile(row).find("td");
      if (td.length === 3) {
        const key = td.eq(0).text().trim();
        const val = td.eq(2).text().trim();
        if (/Student Name/i.test(key)) profile.studentName = val;
        else if (/Register No/i.test(key)) profile.registerNo = val;
        else if (/Institution/i.test(key)) profile.institution = val;
        else if (/Semester/i.test(key)) profile.semester = val;
        else if (/Program \/ Section/i.test(key)) {
          const [program, section] = val.split("/").map((v) => v.trim());
          profile.program = program;
          profile.section = section?.replace(/['"]+/g, "");
        } else if (/Specialization/i.test(key)) profile.specialization = val;
        else if (/D\.O\.B\. \/ Gender/i.test(key)) {
          const [dob, gender] = val.split("/").map((v) => v.trim());
          profile.dob = dob;
          profile.gender = gender;
        }
      }
    });
    const pic = $original("div.profile_pic img").attr("src");
    if (pic) profile.picture = `https://student.srmap.edu.in${pic}`;

    // CGPA
    const cgpaDiv = $cgpa("div[style*='float: right'][style*='font-size']");
    const cgpa = {
      cgpa: cgpaDiv.length ? cgpaDiv.text().split(":")[1]?.trim() || "0" : "0",
    };

    // Subject Map
    const subjectMap = {};
    $subjects("table.table-striped tr").each((_, row) => {
      const td = $subjects(row).find("td");
      if (td.length === 5) {
        subjectMap[td.eq(1).text().trim()] = {
          semester: td.eq(0).text().trim(),
          credit: td.eq(3).text().trim(),
        };
      }
    });

    // Attendance
    const attendance = [];
    $attendance("table#tblSubjectWiseAttendance tr").each((_, row) => {
      const td = $attendance(row).find("td");
      if (td.length === 9) {
        attendance.push({
          subject_code: td.eq(0).text().trim(),
          subject_name: td.eq(1).text().trim(),
          classes_conducted: td.eq(2).text().trim(),
          present: td.eq(3).text().trim(),
          absent: td.eq(4).text().trim(),
          od_ml_taken: td.eq(5).text().trim(),
          present_percentage: td.eq(6).text().trim(),
          od_ml_percentage: td.eq(7).text().trim(),
          attendance_percentage: td.eq(8).text().trim(),
        });
      }
    });

    // Timetable & Subjects
    const rawTimetable = [];
    $timetable("tr").slice(2).each((_, row) => {
      const td = $timetable(row).find("td");
      if (td.length > 1) {
        rawTimetable.push({
          day: td.eq(0).text().trim(),
          subjects: td.slice(1).map((_, el) => $timetable(el).text().trim()).get(),
        });
      }
    });

    const timetable = rawTimetable.slice(0, 5);
    const subjectDetails = [];
    rawTimetable.slice(7).forEach((item) => {
      if (item.subjects.length >= 4) {
        const code = item.day;
        const faculty = item.subjects[2].trim();
        const cabinLocation = getFacultyCabin(faculty);

        subjectDetails.push({
          code,
          name: item.subjects[0],
          ltp: item.subjects[1],
          credit: subjectMap[code]?.credit || "",
          semester: subjectMap[code]?.semester || "",
          faculty,
          classrooms: item.subjects[3],
          facultyCabin: cabinLocation ? { name: faculty, location: cabinLocation } : null,
        });
      }
    });

    // Internal Marks (Exams)
    // PRESERVE NULL FOR UNPUBLISHED MARKS. NEVER DEFAULT UNPUBLISHED MARKS TO 0.
    const exams = [];
    $internals("table.table.table-striped.table-bordered > tbody > tr").each((i, row) => {
      const td = $internals(row).find("td");
      if (td.length === 4) {
        const subject_code = td.eq(0).text().trim();
        const subject_name = td.eq(1).text().trim();
        const raw_obtained = td.eq(2).text().trim();
        const raw_max = td.eq(3).text().trim();

        const isPublished = raw_obtained !== '' && raw_obtained !== '-' && raw_obtained !== 'N/A' && !/not published/i.test(raw_obtained);
        const marks_obtained = isPublished ? raw_obtained : null;
        const max_marks = isPublished ? raw_max : (raw_max || null);

        const detailRow = $internals(row).next("tr");
        const components = [];

        detailRow.find("table tr").each((j, drow) => {
          const dtd = $internals(drow).find("td");
          if (dtd.length === 3 && !dtd.eq(0).hasClass("ui-state-active")) {
            const compName = dtd.eq(0).text().trim();
            const rawConducted = dtd.eq(1).text().trim();
            const rawConverted = dtd.eq(2).text().trim();

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

    // Semester Results Ledger
    const results = [];
    $ledger("div.subTable table tr").each((_, row) => {
      const td = $ledger(row).find("td");
      if (td.length >= 9) {
        results.push({
          semester: td.eq(0).text().trim(),
          month_year: td.eq(1).text().trim(),
          subject_code: td.eq(2).text().trim(),
          subject_description: td.eq(3).text().trim(),
          credit: td.eq(4).text().trim(),
          grade: td.eq(5).text().trim(),
          grade_points: td.eq(6).text().trim(),
          result: td.eq(7).text().trim(),
          attempt: td.eq(8).text().trim(),
          source: 'srm_portal',
        });
      }
    });

    account.profileCache = profile;
    account.cgpaCache = cgpa;
    account.attendanceCache = attendance;
    account.timetableCache = timetable;
    account.subjectsCache = subjectDetails;
    account.examsCache = exams;
    account.resultsCache = results;
    account.lastSuccessfulSync = new Date();
    account.connectionStatus = 'connected';

    await account.save();

    // Synchronize to StudyArena User profile
    const user = await User.findById(account.userId);
    if (user && profile) {
      let updated = false;
      if (profile.studentName && user.name !== profile.studentName) { user.name = profile.studentName; updated = true; }
      
      const regNoToSave = profile.registerNo || account.srmUsername;
      if (regNoToSave && user.registrationNumber !== regNoToSave) { user.registrationNumber = regNoToSave; updated = true; }
      
      if (profile.institution && user.university !== profile.institution) { user.university = profile.institution; updated = true; }
      if (profile.program && user.degree !== profile.program) { user.degree = profile.program; updated = true; }
      if (profile.specialization && user.branch !== profile.specialization) { user.branch = profile.specialization; updated = true; }
      if (profile.section && user.section !== profile.section) { user.section = profile.section; updated = true; }
      
      if (profile.semester) {
        const romanMap = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 };
        let semStr = profile.semester.toLowerCase().replace(/semester|sem/gi, '').trim();
        let semNum = parseInt(semStr, 10);
        if (isNaN(semNum) && romanMap[semStr]) semNum = romanMap[semStr];
        if (isNaN(semNum)) {
          const digitMatch = profile.semester.match(/\b([1-9]|1[0-2])\b/);
          if (digitMatch) semNum = parseInt(digitMatch[1], 10);
        }
        if (!isNaN(semNum) && semNum >= 1 && semNum <= 12) {
          if (user.semester !== semNum) {
            user.semester = semNum;
            updated = true;
          }
          // Normalize profileCache.semester to clean format "Semester N"
          profile.semester = `Semester ${semNum}`;
        }
      }
      
      if (updated) {
        await user.save();
      }
    }

    // Automatically Upsert Subjects
    try {
      if (subjectDetails && subjectDetails.length > 0) {
        for (const sub of subjectDetails) {
          if (!sub.code || !sub.name) continue;

          const existingSubject = await Subject.findOne({ user: account.userId, code: sub.code });
          
          if (existingSubject) {
            // Upsert: Safe update of core fields without wiping custom user fields (like progress, syllabus)
            let subjectUpdated = false;
            
            if (sub.name && existingSubject.name !== sub.name) { existingSubject.name = sub.name; subjectUpdated = true; }
            if (sub.credit) {
              const numCredit = Number(sub.credit);
              if (!isNaN(numCredit) && existingSubject.credits !== numCredit) { existingSubject.credits = numCredit; subjectUpdated = true; }
            }
            if (sub.faculty && existingSubject.faculty !== sub.faculty) { existingSubject.faculty = sub.faculty; subjectUpdated = true; }
            if (sub.semester) {
              const numSem = Number(sub.semester);
              if (!isNaN(numSem) && existingSubject.semester !== numSem) { existingSubject.semester = numSem; subjectUpdated = true; }
            }

            if (subjectUpdated) {
              await existingSubject.save();
            }
          } else {
            // Create new subject
            await Subject.create({
              user: account.userId,
              code: sub.code,
              name: sub.name,
              credits: Number(sub.credit) || 3, // fallback if invalid
              faculty: sub.faculty || '',
              semester: Number(sub.semester) || 1,
            });
          }
        }
      }
    } catch (subjectErr) {
      console.error('Failed to automatically sync subjects:', subjectErr.message);
      // We log but do NOT fail the portal sync so other features still work.
    }

    return true;
  } catch (err) {
    console.error('[PortalService] Error scraping SRM portal data:', err.message);
    throw err;
  }
}

// 4. Get portal data for user
export async function getPortalAccountData(userId) {
  const account = await SrmPortalAccount.findOne({ userId });
  if (!account) {
    return { isConnected: false, hasStoredPortalData: false };
  }

  const hasStoredData = Boolean(
    account.srmUsername ||
    (account.profileCache && Object.keys(account.profileCache).length > 0)
  );

  return {
    isConnected: true,
    hasStoredPortalData: hasStoredData,
    connectionStatus: account.connectionStatus || 'connected',
    isSessionExpired: account.connectionStatus === 'expired',
    srmUsername: account.srmUsername,
    lastSuccessfulSync: account.lastSuccessfulSync,
    source: 'srm_portal',
    profile: account.profileCache || {},
    cgpa: account.cgpaCache || { cgpa: '0' },
    attendance: account.attendanceCache || [],
    timetable: account.timetableCache || [],
    subjects: account.subjectsCache || [],
    exams: account.examsCache || [],
    results: account.resultsCache || [],
  };
}

// 5. Re-sync portal data (called on user request)
export async function reSyncPortalData(userId) {
  const account = await SrmPortalAccount.findOne({ userId }).select('+encryptedPassword +encryptedSessionId');
  if (!account) {
    throw new Error('SRM Portal account is not connected.');
  }

  try {
    const sessionId = await getActiveSession(account);
    await scrapeAndStoreData(account, sessionId);
    account.connectionStatus = 'connected';
    account.lastSuccessfulSync = new Date();
    await account.save();
    return await getPortalAccountData(userId);
  } catch (err) {
    console.warn('[PortalService] Re-sync session refresh failed:', err.message);
    account.connectionStatus = 'expired';
    await account.save();
    const data = await getPortalAccountData(userId);
    data.syncWarning = 'Live SRM session could not be refreshed. Showing your last synced data.';
    return data;
  }
}

// 6. Static JSON APIs: Calendar & Resources
export function getAcademicCalendarData() {
  const calendarPath = path.join(staticDir, 'academic_calendar.json');
  if (fs.existsSync(calendarPath)) {
    return JSON.parse(fs.readFileSync(calendarPath, 'utf8'));
  }
  return {};
}

export function getLearningResourcesData(type, course, year, subjectId) {
  const resDir = path.join(staticDir, 'resources');

  // Map "year1" → "1", "year2" → "2", etc. Also accept bare "1","2".
  const normalizeYear = (y) => {
    if (!y) return null;
    const m = String(y).match(/(\d+)/);
    return m ? m[1] : null;
  };

  if (type === 'courses') {
    // Return a flat sorted list of departments available in the given year.
    // courses.json shape: { "1": { "CSE": { name, code }, "ECE": {...} }, "2": {...} }
    const p = path.join(resDir, 'courses.json');
    if (!fs.existsSync(p)) return [];
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const yr = normalizeYear(year);
    // If a year is provided, return only departments for that year; otherwise all unique depts.
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
    // Return a flat array of subjects for the given department and year.
    // subjects.json shape: { "CSE": { "1": [{id, code, name},...], "2":[...] }, "ECE": {...} }
    // "course" param is the department code (e.g. "CSE", "ECE").
    // "year"   param is "year1", "year2", "1", "2", etc.
    const p = path.join(resDir, 'subjects.json');
    if (!fs.existsSync(p)) return [];
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const yr = normalizeYear(year);
    const dept = (course || '').toUpperCase();

    // Collect subjects: if dept is specified, look only in that dept; else all depts.
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
    // Return resources for a specific subject.
    // resource.json shape: { "CSE": { "1": { "1": { previousYearPapers, slidesAndNotes } } } }
    // Params: course=dept, year=year1, subjectId=numeric id
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

// 7. Disconnect SRM account
export async function disconnectPortalAccount(userId) {
  await SrmPortalAccount.deleteOne({ userId });
  return { success: true, message: 'SRM Portal disconnected successfully.' };
}

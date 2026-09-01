export function safeString(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val).trim();
  return fallback;
}

export function safeNumber(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = safeString(val);
  const cleaned = str.replace(/[^0-9.-]/g, '');
  if (!cleaned) return fallback;
  const num = Number(cleaned);
  return isNaN(num) ? fallback : num;
}

export function safeInt(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.floor(val);
  const str = safeString(val);
  const cleaned = str.replace(/[^0-9-]/g, '');
  if (!cleaned) return fallback;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? fallback : num;
}

export function safeHour(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return (isNaN(val) || val < 1 || val > 15) ? null : Math.floor(val);
  const str = safeString(val);
  const match = str.match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  return (isNaN(num) || num < 1 || num > 15) ? null : num;
}

export function safeStatus(val) {
  const s = safeString(val).toUpperCase();
  if (s === 'P' || s === 'PRESENT' || (s.includes('PRESENT') && !s.includes('NOT'))) {
    return 'PRESENT';
  }
  if (s === 'A' || s === 'ABSENT' || (s.includes('ABSENT') && !s.includes('NOT'))) {
    return 'ABSENT';
  }
  if (s === 'OD' || s === 'ML' || s.includes('OD') || s.includes('ML') || s.includes('DUTY') || s.includes('LEAVE')) {
    return 'OD/ML';
  }
  if (s === '' || s === '-' || s.includes('NOT MARK') || s.includes('UNMARKED')) {
    return 'NOT MARKED';
  }
  return s || 'NOT MARKED';
}

export const TIMETABLE_HOURS = {
  1: { startTime: '09:00', endTime: '09:50' },
  2: { startTime: '10:00', endTime: '10:50' },
  3: { startTime: '11:00', endTime: '11:50' },
  4: { startTime: '12:00', endTime: '12:50' },
  5: { startTime: '13:00', endTime: '13:50' },
  6: { startTime: '14:00', endTime: '14:50' },
  7: { startTime: '15:00', endTime: '15:50' },
  8: { startTime: '16:00', endTime: '17:30' },
};

export const HOUR_SLOTS = Object.entries(TIMETABLE_HOURS).map(([h, t]) => ({
  hour: Number(h),
  startTime: t.startTime,
  endTime: t.endTime,
}));

export function getHourTime(hourNum) {
  const slot = TIMETABLE_HOURS[hourNum] || TIMETABLE_HOURS[Number(hourNum)];
  return slot || { startTime: '', endTime: '' };
}

export function buildSubjectStats(rawCache) {
  if (!Array.isArray(rawCache)) return [];
  return rawCache.map((s) => {
    const cond = s.conducted ?? s.classes_conducted;
    const pres = s.present;
    const abs = s.absent;
    const od = s.odMl ?? s.od_ml_taken;
    const pct = s.percentage ?? s.attendance_percentage;

    return {
      subjectCode: safeString(s.subjectCode || s.subject_code),
      subjectName: safeString(s.subjectName || s.subject_name),
      conducted: safeInt(cond, 0),
      present: safeInt(pres, 0),
      absent: safeInt(abs, 0),
      odMl: safeInt(od, 0),
      percentage: safeNumber(pct, 0),
    };
  }).filter((s) => s.subjectCode);
}

export function computeOverall(stats) {
  let totalC = 0, totalP = 0, totalA = 0, totalO = 0;
  if (Array.isArray(stats)) {
    stats.forEach((s) => {
      totalC += safeInt(s.conducted, 0);
      totalP += safeInt(s.present, 0);
      totalA += safeInt(s.absent, 0);
      totalO += safeInt(s.odMl, 0);
    });
  }
  const pct = totalC > 0 ? parseFloat((((totalP + totalO) / totalC) * 100).toFixed(2)) : 0;
  return {
    conducted: totalC,
    present: totalP,
    absent: totalA,
    odMl: totalO,
    percentage: pct,
    status: pct >= 75 ? 'ELIGIBLE (≥75%)' : 'ATTENDANCE ALERT',
  };
}

export function getTodayIndiaDateInfo() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const isoDate = formatter.format(now);
  const parts = isoDate.split('-');
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  return {
    iso: `${year}-${month}-${day}`,
    dayNum: parseInt(day, 10),
    monthNum: parseInt(month, 10),
    yearNum: parseInt(year, 10),
  };
}

export function isDateMatchingTodayIndia(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return true;
  const str = dateStr.trim().toLowerCase();
  if (!str) return true;

  const today = getTodayIndiaDateInfo();
  if (str.includes(today.iso)) return true;

  const dNum = today.dayNum;
  const dPad = String(dNum).padStart(2, '0');
  const mNum = today.monthNum;
  const mPad = String(mNum).padStart(2, '0');

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthName = monthNames[mNum - 1];

  if (
    str.includes(`${today.yearNum}-${mPad}-${dPad}`) ||
    str.includes(`${dPad}/${mPad}/${today.yearNum}`) ||
    str.includes(`${dPad}-${mPad}-${today.yearNum}`)
  ) {
    return true;
  }

  if (str.includes(monthName) && (str.includes(dPad) || str.includes(String(dNum)))) {
    return true;
  }

  return false;
}

export function buildTodayClassesFromCache(account) {
  if (!account || !Array.isArray(account.todayAttendanceCache)) return [];

  const todayClassesOnly = account.todayAttendanceCache.filter((rec) => {
    if (!rec || !rec.date) return true;
    return isDateMatchingTodayIndia(rec.date);
  });

  return todayClassesOnly.map((rec) => {
    const hour = safeHour(rec.hour) || 1;
    const timeSlot = getHourTime(hour);
    return {
      hour,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      subjectCode: safeString(rec.subjectCode || rec.subject),
      subjectName: safeString(rec.subjectName || rec.subject || rec.subjectCode),
      status: safeStatus(rec.status),
      faculty: safeString(rec.faculty),
      room: safeString(rec.room),
      facultyCabin: rec.facultyCabin || null,
    };
  }).sort((a, b) => a.hour - b.hour);
}

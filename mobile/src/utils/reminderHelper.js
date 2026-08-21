/**
 * Helper utilities for Reminder scheduling and next-occurrence calculation.
 */

/**
 * Validates selected date, time, and recurrence against the current live device moment.
 * Returns detailed, user-friendly error messages if the selection is in the past.
 */
export const validateReminderDateTime = (selectedDate, selectedTime, scheduleType = 'one-time', weekdays = []) => {
  const now = new Date();
  
  if (!selectedDate || isNaN(new Date(selectedDate).getTime())) {
    return { isValid: false, error: 'Please select a valid date.' };
  }
  if (!selectedTime || isNaN(new Date(selectedTime).getTime())) {
    return { isValid: false, error: 'Please select a valid time.' };
  }

  const d = new Date(selectedDate);
  const t = new Date(selectedTime);

  const combined = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    t.getHours(),
    t.getMinutes(),
    0,
    0
  );

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isPastDay = (d1, d2) => {
    const startOfD1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
    const startOfD2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
    return startOfD1 < startOfD2;
  };

  const formatSelectedTimeStr = (dateObj) =>
    dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const formatSelectedDateStr = (dateObj) =>
    dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  // For one-time reminders, the combined date & time must be strictly in the future
  if (scheduleType === 'one-time' || !scheduleType) {
    if (isPastDay(combined, now)) {
      return {
        isValid: false,
        error: `${formatSelectedDateStr(combined)} has already passed. Please choose a future date.`,
      };
    }
    if (combined.getTime() <= now.getTime()) {
      if (isSameDay(combined, now)) {
        return {
          isValid: false,
          error: `${formatSelectedTimeStr(combined)} has already passed. Please choose a later time.`,
        };
      }
      return {
        isValid: false,
        error: 'Reminder date and time must be in the future.',
      };
    }
  }

  if (scheduleType === 'weekly' && (!Array.isArray(weekdays) || weekdays.length === 0)) {
    return {
      isValid: false,
      error: 'Please select at least one weekday for weekly reminders.',
    };
  }

  const validTypes = ['one-time', 'daily', 'weekly', 'monthly', 'yearly'];
  if (!validTypes.includes(scheduleType)) {
    return {
      isValid: false,
      error: 'Invalid recurrence type selected.',
    };
  }

  return { isValid: true, combined, error: null };
};

export const getNextTriggerTimestamp = (reminder) => {
  if (!reminder || !reminder.remindAt) return null;

  const remindDate = new Date(reminder.remindAt);
  if (isNaN(remindDate.getTime())) return null;

  const now = new Date();
  const type = reminder.scheduleType || 'one-time';
  const targetHour = remindDate.getHours();
  const targetMinute = remindDate.getMinutes();

  if (type === 'one-time') {
    const triggerTime = remindDate.getTime();
    // Only return if it is strictly in the future
    if (triggerTime > now.getTime()) {
      return triggerTime;
    }
    return null;
  }

  if (type === 'daily') {
    const candidate = new Date(now);
    candidate.setHours(targetHour, targetMinute, 0, 0);
    if (candidate.getTime() > now.getTime()) {
      return candidate.getTime();
    }
    // Schedule for tomorrow at the same time
    candidate.setDate(candidate.getDate() + 1);
    return candidate.getTime();
  }

  if (type === 'weekly') {
    const selectedWeekdays = Array.isArray(reminder.weekdays) && reminder.weekdays.length > 0
      ? reminder.weekdays
      : [remindDate.getDay()];

    // Search next 7 days for the earliest future match
    for (let offset = 0; offset < 7; offset++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + offset);
      candidate.setHours(targetHour, targetMinute, 0, 0);

      const dayOfWeek = candidate.getDay(); // 0 (Sun) - 6 (Sat)
      if (selectedWeekdays.includes(dayOfWeek) && candidate.getTime() > now.getTime()) {
        return candidate.getTime();
      }
    }

    // Next week fallback
    for (let offset = 7; offset < 14; offset++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + offset);
      candidate.setHours(targetHour, targetMinute, 0, 0);

      const dayOfWeek = candidate.getDay();
      if (selectedWeekdays.includes(dayOfWeek)) {
        return candidate.getTime();
      }
    }
  }

  if (type === 'monthly') {
    const dayOfMonth = reminder.repeatDayOfMonth || remindDate.getDate();
    // Try current month
    const candidate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, targetHour, targetMinute, 0, 0);
    if (candidate.getTime() > now.getTime()) {
      return candidate.getTime();
    }
    // Try next month
    const nextMonthCandidate = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, targetHour, targetMinute, 0, 0);
    return nextMonthCandidate.getTime();
  }

  if (type === 'yearly') {
    const month = remindDate.getMonth();
    const day = reminder.repeatDayOfMonth || remindDate.getDate();
    const candidate = new Date(now.getFullYear(), month, day, targetHour, targetMinute, 0, 0);
    if (candidate.getTime() > now.getTime()) {
      return candidate.getTime();
    }
    // Next year
    const nextYearCandidate = new Date(now.getFullYear() + 1, month, day, targetHour, targetMinute, 0, 0);
    return nextYearCandidate.getTime();
  }

  return null;
};

/**
 * Helper utilities for Reminder scheduling and next-occurrence calculation.
 */

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

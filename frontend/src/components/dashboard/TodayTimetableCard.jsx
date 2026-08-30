import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, User, ChevronRight } from 'lucide-react';
import { useGetTimetable } from '../../services/portalHooks.js';
import { cx } from '../shared.jsx';

export default function TodayTimetableCard() {
  const timetableQuery = useGetTimetable({
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const data = timetableQuery.data;

  if (timetableQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 animate-pulse space-y-3">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-12 w-full bg-muted rounded" />
      </div>
    );
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[new Date().getDay()];
  const rawSlots = data?.timetable?.[todayKey];
  const todaySlots = Array.isArray(rawSlots) ? rawSlots.filter(Boolean) : [];

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return 0;
    return parts[0] * 60 + parts[1];
  };

  let currentSlotIndex = -1;
  let nextSlotIndex = -1;

  todaySlots.forEach((slot, idx) => {
    if (!slot) return;
    const startM = parseTime(slot?.startTime);
    const endM = parseTime(slot?.endTime);
    if (startM > 0 && endM > 0) {
      if (currentMinutes >= startM && currentMinutes <= endM) {
        currentSlotIndex = idx;
      } else if (currentMinutes < startM && nextSlotIndex === -1) {
        nextSlotIndex = idx;
      }
    }
  });

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-accent" />
          <h2 className="font-display text-base font-bold">Today's Timetable</h2>
        </div>
        <Link
          to="/timetable"
          className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
        >
          Full Timetable <ChevronRight size={14} />
        </Link>
      </div>

      {todaySlots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No classes scheduled for today ({todayKey.toUpperCase()}).
        </div>
      ) : (
        <div className="space-y-2.5">
          {todaySlots.map((slot, i) => {
            if (!slot) return null;
            const isCurrent = i === currentSlotIndex;
            const isNext = i === nextSlotIndex;
            const endMinutes = parseTime(slot?.endTime);
            const isCompleted = endMinutes > 0 && currentMinutes > endMinutes;

            let statusBadge = null;
            if (isCurrent) {
              statusBadge = (
                <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent animate-pulse">
                  CURRENT CLASS
                </span>
              );
            } else if (isNext) {
              statusBadge = (
                <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                  NEXT CLASS
                </span>
              );
            } else if (isCompleted) {
              statusBadge = (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  COMPLETED
                </span>
              );
            }

            return (
              <div
                key={i}
                className={cx(
                  'rounded-xl border p-3.5 transition-all',
                  isCurrent
                    ? 'border-accent/40 bg-accent/5 shadow-sm'
                    : isNext
                    ? 'border-blue-500/30 bg-blue-500/5'
                    : 'border-border bg-card opacity-90'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-accent uppercase">
                      {slot?.subjectCode || 'CLASS'}
                    </span>
                    {(slot?.startTime || slot?.endTime) && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={11} /> {slot?.startTime || ''}{slot?.endTime ? ` - ${slot.endTime}` : ''}
                      </span>
                    )}
                  </div>
                  {statusBadge}
                </div>

                <h4 className="mt-1 font-bold text-xs text-foreground line-clamp-1">
                  {slot?.subjectName || slot?.subjectCode || 'Course Session'}
                </h4>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  {slot?.room && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-accent" /> {slot.room}
                    </span>
                  )}
                  {slot?.faculty && (
                    <span className="flex items-center gap-1">
                      <User size={11} /> {slot.faculty}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

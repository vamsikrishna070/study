import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ArrowLeft, MapPin, User, Clock } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { LoadingBlock, QueryState, cx } from '../../components/shared.jsx';
import { useGetPortalStatus } from '../../services/portalHooks.js';

const SLOTS = [
  "H1 • 09:00 - 09:50",
  "H2 • 10:00 - 10:50",
  "H3 • 11:00 - 11:50",
  "H4 • 12:00 - 12:50",
  "H5 • 13:00 - 13:50",
  "H6 • 14:00 - 14:50",
  "H7 • 15:00 - 15:50",
  "H8 • 16:00 - 17:30"
];

export default function PortalTimetable() {
  const statusQuery = useGetPortalStatus();
  const [selectedDay, setSelectedDay] = useState('Monday');

  const data = statusQuery.data;

  if (statusQuery.isLoading) {
    return (
      <Shell>
        <LoadingBlock lines={8} />
      </Shell>
    );
  }

  if (statusQuery.error || !data) {
    return (
      <Shell>
        <QueryState error={statusQuery.error || 'Empty'} onRetry={() => statusQuery.refetch()} label="Portal Timetable" />
      </Shell>
    );
  }

  const timetable = data?.timetable || [];
  const subjectsMap = data?.subjects || [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const currentDayData = timetable.find((d) => d.day?.toLowerCase() === selectedDay.toLowerCase()) || { subjects: [] };

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Link to="/portal" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2">
            <ArrowLeft size={14} /> Back to Portal Overview
          </Link>
          <h1 className="font-display text-4xl font-bold">Weekly Timetable</h1>
          <p className="mt-1 text-sm text-muted-foreground">Class schedule with room building codes and faculty details.</p>
        </div>

        <div className="flex gap-2 border-b border-border pb-3 overflow-x-auto">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cx(
                'rounded-xl px-4 py-2 text-sm font-bold transition-all whitespace-nowrap',
                selectedDay.toLowerCase() === day.toLowerCase()
                  ? 'bg-accent text-accent-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {currentDayData.subjects?.length === 0 ? (
            <div className="rounded-2xl border border-card-border bg-card p-10 text-center text-sm text-muted-foreground">
              No classes scheduled for {selectedDay}.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SLOTS.map((slotTime, idx) => {
                const subStr = currentDayData.subjects[idx];
                const matchedDetail = subjectsMap.find((s) => subStr && subStr.includes(s.code));

                return (
                  <div
                    key={idx}
                    className={cx(
                      'rounded-2xl border p-5 transition-all shadow-sm',
                      subStr
                        ? 'border-card-border bg-card'
                        : 'border-dashed border-border bg-card/30 opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-accent mb-2">
                      <Clock size={12} />
                      <span>{slotTime}</span>
                    </div>

                    {subStr ? (
                      <div className="space-y-2">
                        <h3 className="font-bold text-base line-clamp-2">{subStr}</h3>
                        {matchedDetail && (
                          <div className="space-y-1 text-xs text-muted-foreground">
                            {matchedDetail.faculty && (
                              <div className="flex items-center gap-1.5">
                                <User size={12} />
                                <span>{matchedDetail.faculty}</span>
                              </div>
                            )}
                            {matchedDetail.classrooms && (
                              <div className="flex items-center gap-1.5 text-accent font-medium">
                                <MapPin size={12} />
                                <span>Classroom: {matchedDetail.classrooms}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-muted-foreground font-mono">
                        Free Slot
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

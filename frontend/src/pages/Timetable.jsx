import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, User, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import Shell from '../components/Shell.jsx';
import { LoadingBlock, QueryState, cx } from '../components/shared.jsx';
import { useGetTimetable, useSyncPortal } from '../services/portalHooks.js';
import { useToast } from '../components/ui/use-toast.js';
import { getUserFriendlyError } from '../utils/errorUtils.js';

const DAYS = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
  { key: 'saturday', label: 'SAT' },
];

export default function Timetable() {
  const { toast } = useToast();
  const timetableQuery = useGetTimetable();
  const syncMutation = useSyncPortal();

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[new Date().getDay()];
  const initialTab = DAYS.some((d) => d.key === todayKey) ? todayKey : 'monday';

  const [activeDay, setActiveDay] = useState(initialTab);

  const data = timetableQuery.data;

  const handleRefresh = async () => {
    try {
      await syncMutation.mutateAsync();
      timetableQuery.refetch();
      toast({ title: 'Refreshed', description: 'Weekly timetable updated.' });
    } catch (err) {
      toast({ title: 'Sync Failed', description: getUserFriendlyError(err, 'portal_connect'), variant: 'destructive' });
    }
  };

  if (timetableQuery.isLoading) {
    return (
      <Shell>
        <LoadingBlock lines={8} />
      </Shell>
    );
  }

  if (timetableQuery.error) {
    return (
      <Shell>
        <QueryState error={timetableQuery.error} onRetry={() => timetableQuery.refetch()} label="Weekly Timetable" />
      </Shell>
    );
  }

  const timetableData = data?.timetable || {};
  const activeDaySlots = timetableData[activeDay] || [];
  const lastSynced = data?.lastSynced ? new Date(data.lastSynced).toLocaleString('en-IN') : null;

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2">
              <ArrowLeft size={14} /> Back to Overview
            </Link>
            <h1 className="font-display text-4xl font-bold">Weekly Timetable</h1>
            {lastSynced && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock size={12} /> Last synced: <strong className="text-foreground">{lastSynced}</strong>
              </p>
            )}
          </div>

          <button
            onClick={handleRefresh}
            disabled={syncMutation.isPending}
            className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
            <span>{syncMutation.isPending ? 'Syncing...' : 'Refresh Timetable'}</span>
          </button>
        </div>

        {/* Day Tabs */}
        <div className="flex border-b border-border/60 overflow-x-auto no-scrollbar">
          {DAYS.map((day) => {
            const isActive = activeDay === day.key;
            const isToday = todayKey === day.key;
            return (
              <button
                key={day.key}
                onClick={() => setActiveDay(day.key)}
                className={cx(
                  'flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{day.label}</span>
                {isToday && (
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-extrabold text-accent">
                    TODAY
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Slots List */}
        {activeDaySlots.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-12 text-center text-sm text-muted-foreground space-y-2">
            <CalendarDays size={32} className="mx-auto text-muted-foreground/60" />
            <p className="font-bold text-foreground">No classes scheduled for {activeDay.toUpperCase()}.</p>
            <p className="text-xs">Enjoy your study break or focus on self-directed tasks.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeDaySlots.map((slot, idx) => {
              if (!slot) return null;
              return (
                <div key={idx} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-accent uppercase">{slot?.subjectCode || 'CLASS'}</span>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                      H{slot?.hour || idx + 1} • {slot?.type || 'LECTURE'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base line-clamp-1">{slot?.subjectName || slot?.subjectCode || 'Course Session'}</h3>
                    {(slot?.startTime || slot?.endTime) && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock size={13} className="text-accent" />
                        <span>{slot?.startTime || ''}{slot?.endTime ? ` - ${slot.endTime}` : ''}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground">
                    {slot?.room && (
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-accent" />
                        <span className="font-semibold text-foreground">{slot.room}</span>
                      </div>
                    )}
                    {slot?.faculty && (
                      <div className="flex items-center gap-2">
                        <User size={13} />
                        <span>{slot.faculty}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}

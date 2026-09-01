import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, ArrowLeft, CheckCircle2, PartyPopper } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { LoadingBlock, QueryState, cx } from '../../components/shared.jsx';
import { useGetAcademicCalendar } from '../../services/portalHooks.js';

export default function PortalCalendar() {
  const [activeTab, setActiveTab] = useState('odd');
  const calendarQuery = useGetAcademicCalendar();
  const data = calendarQuery.data;

  if (calendarQuery.isLoading) {
    return (
      <Shell>
        <LoadingBlock lines={8} />
      </Shell>
    );
  }

  if (calendarQuery.error || !data) {
    return (
      <Shell>
        <QueryState error={calendarQuery.error || 'Empty'} onRetry={() => calendarQuery.refetch()} label="Academic Calendar" />
      </Shell>
    );
  }

  const events =
    activeTab === 'odd'
      ? data.oddSemesterData || []
      : activeTab === 'even'
      ? data.evenSemesterData || []
      : data.summerTermData || [];

  const holidays =
    activeTab === 'odd'
      ? data.oddSemesterHolidays || []
      : data.evenSemesterHolidays || [];

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <Link to="/portal" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2">
            <ArrowLeft size={14} /> Back to Portal Overview
          </Link>
          <h1 className="font-display text-4xl font-bold">Academic Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Official SRM AP academic schedules, key deadlines, and holidays.</p>
        </div>

        <div className="flex gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab('odd')}
            className={cx(
              'rounded-xl px-5 py-2.5 text-sm font-bold transition-all',
              activeTab === 'odd'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            Odd Semester
          </button>
          <button
            onClick={() => setActiveTab('even')}
            className={cx(
              'rounded-xl px-5 py-2.5 text-sm font-bold transition-all',
              activeTab === 'even'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            Even Semester
          </button>
          <button
            onClick={() => setActiveTab('summer')}
            className={cx(
              'rounded-xl px-5 py-2.5 text-sm font-bold transition-all',
              activeTab === 'summer'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            Summer Term
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">

          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <CalendarIcon size={20} className="text-accent" />
              <span>Semester Events ({events.length})</span>
            </h2>

            <div className="space-y-3">
              {events.map((item) => (
                <div key={item.id} className="rounded-2xl border border-card-border bg-card p-4 shadow-sm flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-base">{item.details}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{item.day}</p>
                  </div>
                  <span className="shrink-0 rounded-xl bg-accent/10 px-3 py-1 font-mono text-xs font-bold text-accent">
                    {item.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <PartyPopper size={20} className="text-amber-500" />
              <span>Holidays ({holidays.length})</span>
            </h2>

            <div className="space-y-3">
              {holidays.map((h) => (
                <div key={h.id} className="rounded-2xl border border-card-border bg-card p-4 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-amber-500">{h.occasion}</h3>
                    <span className="font-mono text-xs font-bold">{h.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{h.day}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

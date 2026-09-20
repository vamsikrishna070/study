import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  AlertCircle,
  GraduationCap,
  ShieldAlert,
  Calculator,
  Radio,
} from 'lucide-react';
import {
  useGetTodayAttendance,
  useMarkAttendanceCode,
  useGetPortalStatus,
  useVerifyPortal,
} from '../../services/portalHooks.js';
import { getUserFriendlyError } from '../../utils/errorUtils.js';
import { cx } from '../shared.jsx';

export default function TodayAttendanceCard({ initialData, isLoading }) {
  const statusQuery = useGetPortalStatus({
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !initialData && !isLoading,
  });
  const statusData = statusQuery.data || initialData;
  const isConnected = Boolean(statusData?.isConnected);
  const isVerifiedFromStatus = Boolean(statusData?.isVerified);

  const verifyQuery = useVerifyPortal({
    refetchOnWindowFocus: false,
    enabled: isConnected && !isVerifiedFromStatus && !initialData && !isLoading,
  });
  const attendanceQuery = useGetTodayAttendance({
    retry: 1,
    refetchOnWindowFocus: false,
    enabled: !initialData && !isLoading && (statusQuery.isLoading || isConnected),
  });
  const markMutation = useMarkAttendanceCode();

  const [code, setCode] = useState('');
  const [sessionExpiredLocal, setSessionExpiredLocal] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const verifyData = verifyQuery.data;
  const attendanceData = attendanceQuery.data || initialData;
  const isVerifyLoading = verifyQuery.isLoading && verifyQuery.fetchStatus !== 'idle';

  const isSessionActive = Boolean(
    !sessionExpiredLocal &&
    (verifyData?.status === 'verified' || (isVerifiedFromStatus && !isVerifyLoading))
  );

  const handleMarkCode = async (e) => {
    e.preventDefault();
    if (!code.trim() || markMutation.isPending) return;

    setFeedback(null);
    try {
      const res = await markMutation.mutateAsync(code.trim().toUpperCase());
      if (res?.success) {
        setFeedback({
          type: 'success',
          text: res.message || '✓ Attendance marked successfully!',
        });
        setCode('');
      } else {
        setFeedback({
          type: 'error',
          text: res?.message || 'The attendance code is invalid or has expired.',
        });
      }
    } catch (err) {
      const isExpired =
        err?.response?.status === 401 ||
        err?.response?.data?.code === 'PORTAL_SESSION_EXPIRED' ||
        err?.message?.includes('session expired');

      if (isExpired) {
        setSessionExpiredLocal(true);
        setFeedback({
          type: 'error',
          text: 'Portal session expired. Please initiate a new session.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: getUserFriendlyError(err, 'portal_connect'),
        });
      }
    }
  };

  const handleRefresh = () => {
    setFeedback(null);
    attendanceQuery.refetch();
    statusQuery.refetch();
    verifyQuery.refetch();
  };

  if (isLoading && !initialData) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm space-y-4 animate-pulse">
        <div className="flex justify-between items-center pb-4 border-b border-border/50">
          <div className="h-5 w-36 bg-muted rounded" />
          <div className="h-7 w-20 bg-muted rounded" />
        </div>
        <div className="h-16 w-full bg-muted/60 rounded-xl" />
        <div className="h-24 w-full bg-muted/40 rounded-xl" />
      </div>
    );
  }

  if (statusData && !isConnected) {
    return (
      <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap size={20} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold">Today's Attendance</h2>
                <p className="text-xs text-muted-foreground">Official SRM AP Portal Sync</p>
              </div>
            </div>
            <Link
              to="/portal/attendance-planner"
              className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
            >
              <Calculator size={13} /> Planner
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
            <p className="text-sm font-semibold">Connect your SRM portal to view today's attendance.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Track daily class slots and mark live attendance codes.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Link
                to="/portal"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:opacity-90"
              >
                Initiate Session
              </Link>
              <Link
                to="/portal/attendance-planner"
                className="inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-bold text-accent hover:bg-accent/20"
              >
                <Calculator size={13} /> Attendance Planner
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const dayOrder = attendanceData?.dayOrder;
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
  const classes = Array.isArray(attendanceData?.attendance) ? attendanceData.attendance.filter(Boolean) : [];

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold">Today's Attendance</h2>
            {dayOrder && (
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-bold text-accent">
                Day Order {dayOrder}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock size={12} /> {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/portal/attendance-planner"
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent hover:bg-accent/20 transition-all"
          >
            <Calculator size={13} />
            <span>Planner</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={attendanceQuery.isFetching}
            className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw size={12} className={attendanceQuery.isFetching ? 'animate-spin' : ''} />
            <span>{attendanceQuery.isFetching ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {!isSessionActive ? (
        <div className="rounded-xl border border-card-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            {isVerifyLoading ? (
              <RefreshCw size={18} className="text-accent mt-0.5 animate-spin" />
            ) : (
              <Radio size={18} className="text-accent mt-0.5" />
            )}
            <div>
              <h3 className="text-xs font-bold text-foreground">
                {isVerifyLoading ? 'Checking session...' : 'Portal session not active'}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isVerifyLoading
                  ? 'Verifying your SRM portal session status.'
                  : 'Please initiate a new session to submit attendance codes.'}
              </p>
            </div>
          </div>
          {!isVerifyLoading && (
            <div>
              <Link
                to="/portal/attendance"
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-xs font-bold text-accent-foreground shadow-sm hover:opacity-90"
              >
                Initiate Session
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleMarkCode} className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Mark Attendance Code
              </label>
              <p className="text-[11px] text-muted-foreground">
                Enter code displayed by faculty during live class
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="E.g. A123456"
                maxLength={15}
                disabled={markMutation.isPending}
                className="w-36 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={!code.trim() || markMutation.isPending}
                className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                <Send size={12} />
                <span>{markMutation.isPending ? 'Marking...' : 'Submit'}</span>
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={cx(
                'flex items-center gap-2 rounded-lg p-2.5 text-xs font-semibold',
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              )}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{feedback.text}</span>
            </div>
          )}
        </form>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Scheduled Conduct Hours ({classes.length})
        </h3>

        {classes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
            No attendance has been marked yet today.
          </div>
        ) : (
          <div className="space-y-2.5">
            {classes.map((cls, i) => {
              if (!cls) return null;
              const statusUpper = (cls?.status || 'NOT MARKED').toUpperCase();
              let badgeColor = 'bg-muted text-muted-foreground';
              if (statusUpper === 'PRESENT') badgeColor = 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20';
              if (statusUpper === 'ABSENT') badgeColor = 'bg-rose-500/15 text-rose-500 border border-rose-500/20';
              if (statusUpper === 'LATE') badgeColor = 'bg-amber-500/15 text-amber-500 border border-amber-500/20';

              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                      H{cls?.hour || i + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-accent uppercase">
                          {cls?.subjectCode || 'CLASS'}
                        </span>
                        {(cls?.startTime || cls?.endTime) && (
                          <span className="text-xs text-muted-foreground">
                            • {cls?.startTime || ''}{cls?.endTime ? ` - ${cls.endTime}` : ''}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-foreground line-clamp-1">
                        {cls?.subjectName || cls?.subjectCode || 'Course Session'}
                      </h4>
                    </div>
                  </div>

                  <span className={cx('rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase', badgeColor)}>
                    {statusUpper}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

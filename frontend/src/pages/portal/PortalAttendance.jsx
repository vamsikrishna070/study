import { Link } from 'react-router-dom';
import { BookOpen, AlertTriangle, CheckCircle2, Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { LoadingBlock, QueryState, cx } from '../../components/shared.jsx';
import { useGetPortalStatus, useSyncPortal } from '../../services/portalHooks.js';
import { useToast } from '../../components/ui/use-toast.js';

export default function PortalAttendance() {
  const { toast } = useToast();
  const statusQuery = useGetPortalStatus();
  const syncMutation = useSyncPortal();

  const data = statusQuery.data;

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      toast({ title: 'Refreshed', description: 'Attendance updated.' });
    } catch (err) {
      toast({ title: 'Sync Failed', description: err.message, variant: 'destructive' });
    }
  };

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
        <QueryState error={statusQuery.error || 'Empty'} onRetry={() => statusQuery.refetch()} label="Portal Attendance" />
      </Shell>
    );
  }

  const isConnected = data?.isConnected;
  const attendanceList = data?.attendance || [];
  const subjectsList = data?.subjects || [];
  const enrolledCount = data?.enrolledSubjectsCount ?? Math.max(subjectsList.length, attendanceList.length);
  const lastSynced = data?.lastSuccessfulSync
    ? new Date(data.lastSuccessfulSync).toLocaleString('en-IN')
    : null;

  const lowAttendanceItems = attendanceList.filter((item) => {
    const pct = parseFloat(item.attendance_percentage || '0');
    return pct < 75;
  });

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/portal" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2">
              <ArrowLeft size={14} /> Back to Portal Overview
            </Link>
            <h1 className="font-display text-4xl font-bold">Subject Attendance</h1>
            {lastSynced && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock size={12} /> Last synced: <strong className="text-foreground">{lastSynced}</strong>
              </p>
            )}
          </div>

          {isConnected && (
            <button
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
              <span>{syncMutation.isPending ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}
        </div>

        {lowAttendanceItems.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-500">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Attendance Warning ({lowAttendanceItems.length} Subject{lowAttendanceItems.length > 1 ? 's' : ''} below 75%)</span>
            </div>
            <p className="mt-1 text-xs text-amber-500/80">
              You need at least 75% attendance to qualify for examinations. Please prioritize attending upcoming sessions.
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-card-border bg-card p-6">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Enrolled Subjects</span>
            <div className="mt-2 font-display text-4xl font-bold">{enrolledCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Active course modules</p>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-6">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Low Attendance</span>
            <div className="mt-2 font-display text-4xl font-bold text-amber-500">{lowAttendanceItems.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Subjects requiring attention</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold">Subject Wise Log</h2>
          {attendanceList.length === 0 ? (
            <div className="rounded-2xl border border-card-border bg-card p-8 text-center text-sm text-muted-foreground">
              {isConnected
                ? 'No attendance records found yet. Click Sync to import subject attendance logs from your SRM Portal.'
                : 'No attendance records found. Connect your SRM Portal to import subject logs.'}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {attendanceList.map((item, idx) => {
                const pct = parseFloat(item.attendance_percentage || '0');
                const isLow = pct < 75;
                return (
                  <div key={idx} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">{item.subject_code}</span>
                        <h3 className="font-bold text-base line-clamp-1">{item.subject_name}</h3>
                      </div>
                      <span className={cx('rounded-full px-3 py-1 text-xs font-bold', isLow ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500')}>
                        {item.attendance_percentage}%
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cx('h-full transition-all duration-500', isLow ? 'bg-amber-500' : 'bg-emerald-500')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs border-t border-border/50">
                      <div>
                        <div className="font-bold">{item.classes_conducted}</div>
                        <div className="text-[10px] text-muted-foreground">Conducted</div>
                      </div>
                      <div>
                        <div className="font-bold text-emerald-500">{item.present}</div>
                        <div className="text-[10px] text-muted-foreground">Present</div>
                      </div>
                      <div>
                        <div className="font-bold text-rose-500">{item.absent}</div>
                        <div className="text-[10px] text-muted-foreground">Absent</div>
                      </div>
                      <div>
                        <div className="font-bold text-purple-500">{item.od_ml_taken || '0'}</div>
                        <div className="text-[10px] text-muted-foreground">OD / ML</div>
                      </div>
                    </div>
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

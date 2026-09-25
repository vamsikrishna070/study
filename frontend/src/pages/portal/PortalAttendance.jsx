import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  RefreshCw,
  Calculator,
  MapPin,
  Send,
  Radio,
} from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { LoadingBlock, QueryState, cx, Modal, Button } from '../../components/shared.jsx';
import {
  useGetPortalStatus,
  useConnectPortal,
  useSyncPortal,
  useGetTodayAttendance,
  useMarkAttendanceCode,
} from '../../services/portalHooks.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/ui/use-toast.js';
import { getUserFriendlyError } from '../../utils/errorUtils.js';

export default function PortalAttendance() {
  const { toast } = useToast();
  const { refreshUser } = useAuth();

  const statusQuery = useGetPortalStatus();
  const todayAttendanceQuery = useGetTodayAttendance();
  const connectMutation = useConnectPortal();
  const syncMutation = useSyncPortal();
  const markCodeMutation = useMarkAttendanceCode();

  const [activeTab, setActiveTab] = useState('subjects');
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [srmUsername, setSrmUsername] = useState('');
  const [srmPassword, setSrmPassword] = useState('');
  const [attendanceCode, setAttendanceCode] = useState('');
  const [sessionExpiredLocal, setSessionExpiredLocal] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState(null);

  const statusData = statusQuery.data;
  const todayData = todayAttendanceQuery.data || {};

  const isLoading = statusQuery.isLoading;
  const isConnected = Boolean(statusData?.isConnected || statusData?.hasStoredPortalData || statusData?.srmUsername);
  const isSessionActive = Boolean(isConnected && !sessionExpiredLocal);

  const handleOpenInitiate = () => {
    setSrmUsername(statusData?.registrationNumber || statusData?.data?.srmUsername || '');
    setSrmPassword('');
    setShowConnectModal(true);
  };

  const handleInitiateSessionSubmit = async (e) => {
    e.preventDefault();
    const cleanUsername = srmUsername.trim().toUpperCase();
    if (!cleanUsername || !srmPassword) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your Registration Number and Password.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await connectMutation.mutateAsync({
        srmUsername: cleanUsername,
        srmPassword,
      });

      setSessionExpiredLocal(false);
      await refreshUser();
      toast({
        title: 'Session Initiated',
        description: 'SRM Portal session active and data synchronized successfully.',
      });
      setShowConnectModal(false);
      setSrmPassword('');
    } catch (err) {
      toast({
        title: 'Session Initiation Failed',
        description: getUserFriendlyError(err, 'portal_connect'),
        variant: 'destructive',
      });
    }
  };

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      setSessionExpiredLocal(false);
      toast({ title: 'Refreshed', description: 'Attendance logs updated successfully.' });
    } catch (err) {
      const isExpired =
        err?.response?.status === 401 ||
        err?.response?.data?.code === 'PORTAL_SESSION_EXPIRED' ||
        err?.message?.includes('session expired');

      if (isExpired) {
        setSessionExpiredLocal(true);
      }
      toast({
        title: 'Sync Failed',
        description: getUserFriendlyError(err, 'portal_sync'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    const code = attendanceCode.trim().toUpperCase();
    if (!code) {
      setCodeFeedback({
        type: 'error',
        text: 'Please enter an attendance code.',
      });
      return;
    }

    if (code.length < 3) {
      setCodeFeedback({
        type: 'error',
        text: 'Attendance code must be at least 3 characters long.',
      });
      return;
    }

    setCodeFeedback(null);

    try {
      const res = await markCodeMutation.mutateAsync(code);
      if (res?.success) {
        setCodeFeedback({
          type: 'success',
          text: res?.message || '✓ Attendance marked successfully for your current period!',
        });
        toast({
          title: 'Attendance Marked!',
          description: res?.message || 'Attendance captured successfully for your current period.',
        });
        setAttendanceCode('');
        todayAttendanceQuery.refetch();
        statusQuery.refetch();
      } else {
        setCodeFeedback({
          type: 'error',
          text: res?.message || 'The attendance code is invalid or not accepted.',
        });
      }
    } catch (err) {
      const isExpired =
        err?.response?.status === 401 ||
        err?.response?.data?.code === 'PORTAL_SESSION_EXPIRED' ||
        err?.message?.includes('session expired');

      if (isExpired) {
        setSessionExpiredLocal(true);
        setCodeFeedback({
          type: 'error',
          text: 'Your portal session has expired. Please initiate a new session.',
        });
        toast({
          title: 'Portal Session Expired',
          description: 'Your SRM portal session expired. Please initiate a new session to submit attendance.',
          variant: 'destructive',
        });
      } else {
        const errorMsg =
          err?.response?.data?.message ||
          getUserFriendlyError(err, 'portal_sync') ||
          'Failed to submit attendance code.';
        setCodeFeedback({
          type: 'error',
          text: errorMsg,
        });
        toast({
          title: 'Attendance Submission Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Shell>
        <LoadingBlock lines={8} />
      </Shell>
    );
  }

  if (statusQuery.error && !statusData) {
    return (
      <Shell>
        <QueryState
          error={statusQuery.error || 'Empty'}
          onRetry={() => statusQuery.refetch()}
          label="Portal Attendance"
        />
      </Shell>
    );
  }

  const attendanceList = statusData?.subjectStats || [];
  const subjectsList = statusData?.subjects || [];
  const enrolledCount =
    statusData?.enrolledSubjectsCount ?? Math.max(subjectsList.length, attendanceList.length);
  const lastSynced = statusData?.lastSuccessfulSync
    ? new Date(statusData.lastSuccessfulSync).toLocaleString('en-IN')
    : null;

  const lowAttendanceItems = attendanceList.filter((item) => {
    const pct = parseFloat(item.percentage || item.attendance_percentage || '0');
    return pct < 75;
  });

  const todayClasses = todayData.classes || todayData.attendance || [];

  return (
    <Shell>
      <div className="space-y-6">
        {}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/portal"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2"
            >
              <ArrowLeft size={14} /> Back to Portal Overview
            </Link>
            <h1 className="font-display text-4xl font-bold">Subject Attendance</h1>
            {lastSynced && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock size={12} /> Last synced: <strong className="text-foreground">{lastSynced}</strong>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/portal/attendance-planner"
              className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-accent bg-accent/10 px-4 py-2 text-sm font-bold text-accent shadow-sm hover:bg-accent/20 transition-all"
            >
              <Calculator size={15} />
              <span>Attendance Planner</span>
            </Link>

            {isConnected && (
              <button
                onClick={handleSync}
                disabled={syncMutation.isPending}
                style={{ backgroundColor: '#EF4444' }}
                className="focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
                <span>{syncMutation.isPending ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}
          </div>
        </div>

        {}
        {!isSessionActive && (
          <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Radio size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-lg font-bold text-foreground">
                  {!isConnected ? 'SRM Portal Not Connected' : 'Portal session expired'}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!isConnected
                    ? 'Connect your SRM portal to submit live attendance codes and sync academic records.'
                    : 'Your session has expired. Re-authenticate to submit live attendance codes.'}
                </p>
              </div>
            </div>

            <div>
              <button
                onClick={handleOpenInitiate}
                disabled={connectMutation.isPending}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {connectMutation.isPending ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>{!isConnected ? 'Connect Portal' : 'Reconnect Session'}</span>
                )}
              </button>
            </div>
          </div>
        )}

        {}
        {isSessionActive && (
          <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Mark Attendance Code
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter the code displayed by faculty during live class.
              </p>
            </div>

            <form onSubmit={handleMarkAttendance} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 max-w-sm">
                <input
                  type="text"
                  maxLength={15}
                  placeholder="E.g. A123456"
                  value={attendanceCode}
                  onChange={(e) => setAttendanceCode(e.target.value.toUpperCase())}
                  disabled={markCodeMutation.isPending}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-foreground placeholder:font-sans placeholder:font-normal placeholder:tracking-normal focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <button
                type="submit"
                disabled={markCodeMutation.isPending || !attendanceCode.trim()}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {markCodeMutation.isPending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </form>

            {codeFeedback && (
              <div
                className={cx(
                  'flex items-center gap-2 rounded-xl p-3 text-xs font-semibold',
                  codeFeedback.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                )}
              >
                {codeFeedback.type === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
                <span>{codeFeedback.text}</span>
              </div>
            )}
          </div>
        )}

        {}
        <div className="flex gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab('subjects')}
            className={cx(
              'rounded-xl px-4 py-2 text-sm font-bold transition-all',
              activeTab === 'subjects'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            Subject Attendance ({attendanceList.length})
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={cx(
              'rounded-xl px-4 py-2 text-sm font-bold transition-all',
              activeTab === 'today'
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            )}
          >
            Today&apos;s Conduct
          </button>
        </div>

        {}
        {lowAttendanceItems.length > 0 && activeTab === 'subjects' && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-500">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Attendance Warning ({lowAttendanceItems.length} Subject{lowAttendanceItems.length > 1 ? 's' : ''} below 75%)</span>
            </div>
            <p className="mt-1 text-xs text-amber-500/80">
              You need at least 75% attendance to qualify for examinations. Use the <Link to="/portal/attendance-planner" className="underline font-bold">Attendance Planner</Link> to simulate how many classes you can afford to miss.
            </p>
          </div>
        )}

        {}
        {activeTab === 'subjects' && (
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
        )}

        {}
        {activeTab === 'subjects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Subject Wise Log</h2>
              <Link to="/portal/attendance-planner" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                <Calculator size={13} /> Open Bunk Simulator
              </Link>
            </div>

            {attendanceList.length === 0 ? (
              <div className="rounded-2xl border border-card-border bg-card p-8 text-center text-sm text-muted-foreground">
                {isConnected
                  ? 'No attendance records found yet. Click Sync to import subject attendance logs from your SRM Portal.'
                  : 'No attendance records found. Connect your SRM Portal to import subject logs.'}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {attendanceList.map((item, idx) => {
                  const pct = parseFloat(item.percentage ?? item.attendance_percentage ?? '0');
                  const isLow = pct < 75;
                  return (
                    <div key={idx} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">{item.subjectCode || item.subject_code}</span>
                          <h3 className="font-bold text-base line-clamp-1">{item.subjectName || item.subject_name}</h3>
                        </div>
                        <span className={cx('rounded-full px-3 py-1 text-xs font-bold', isLow ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500')}>
                          {pct}%
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
                          <div className="font-bold text-lg">{item.conducted ?? item.classes_conducted}</div>
                          <div className="text-[10px] text-muted-foreground">Conducted</div>
                        </div>
                        <div>
                          <div className="font-bold text-lg text-emerald-500">{item.present}</div>
                          <div className="text-[10px] text-muted-foreground">Present</div>
                        </div>
                        <div>
                          <div className="font-bold text-lg text-rose-500">{item.absent}</div>
                          <div className="text-[10px] text-muted-foreground">Absent</div>
                        </div>
                        <div>
                          <div className="font-bold text-lg text-purple-500">{item.odMl ?? item.od_ml_taken ?? '0'}</div>
                          <div className="text-[10px] text-muted-foreground">OD / ML</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {}
        {activeTab === 'today' && (
          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold">Today&apos;s Class Schedule & Conduct</h2>
            {todayClasses.length === 0 ? (
              <div className="rounded-2xl border border-card-border bg-card p-10 text-center text-sm text-muted-foreground">
                No classes scheduled or recorded for today.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {todayClasses.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-card-border bg-card p-5 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
                          {item.slot || `Period ${idx + 1}`}
                        </span>
                        <h3 className="font-bold text-sm leading-snug">{item.subject_name || item.course || 'Class'}</h3>
                      </div>
                      <span className={cx(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize',
                        item.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' :
                        item.status === 'Absent' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-secondary text-secondary-foreground'
                      )}>
                        {item.status || 'Scheduled'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2">
                      {item.faculty && (
                        <div className="line-clamp-1">Faculty: <strong className="text-foreground">{item.faculty}</strong></div>
                      )}
                      {item.room && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} /> Room: {item.room}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {}
        {showConnectModal && (
          <Modal
            title="Initiate Portal Session"
            eyebrow="SRM AP Student Portal"
            onClose={() => setShowConnectModal(false)}
            footer={
              <div className="flex justify-end gap-3 w-full">
                <Button variant="quiet" onClick={() => setShowConnectModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInitiateSessionSubmit}
                  disabled={connectMutation.isPending || !srmUsername.trim() || !srmPassword}
                >
                  {connectMutation.isPending ? 'Connecting...' : 'Initiate Session'}
                </Button>
              </div>
            }
          >
            <form onSubmit={handleInitiateSessionSubmit} className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter your SRM Student Portal credentials to establish an active session and enable real-time attendance submission.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AP21110010001"
                  value={srmUsername}
                  onChange={(e) => setSrmUsername(e.target.value.toUpperCase())}
                  disabled={connectMutation.isPending}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm font-mono font-bold uppercase text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Portal Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={srmPassword}
                  onChange={(e) => setSrmPassword(e.target.value)}
                  disabled={connectMutation.isPending}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </form>
          </Modal>
        )}
      </div>
    </Shell>
  );
}

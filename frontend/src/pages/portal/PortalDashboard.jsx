import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  GraduationCap,
  RefreshCw,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Award,
  ChevronRight,
  ShieldCheck,
  PartyPopper,
  UserCheck,
  Loader2,
} from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { LoadingBlock, QueryState, cx } from '../../components/shared.jsx';
import {
  useGetPortalStatus,
  useConnectPortal,
  useSyncPortal,
  useDisconnectPortal,
} from '../../services/portalHooks.js';
import { useToast } from '../../components/ui/use-toast.js';
import { formatSemester } from '../../utils/semester.js';
import { getUserFriendlyError } from '../../utils/errorUtils.js';

// Portal features (Course Resources removed per requirements)
const PORTAL_FEATURES = [
  {
    title: 'Attendance Details',
    desc: 'Subject-wise conduct counts & percentage progress',
    href: '/portal/attendance',
    icon: BookOpen,
  },
  {
    title: 'Weekly Timetable',
    desc: 'Daily class schedules & room location tags',
    href: '/portal/timetable',
    icon: CalendarDays,
  },
  {
    title: 'Exams & Performance',
    desc: 'Official SRM assessment marks automatically synced from portal',
    href: '/portal/exams',
    icon: Award,
  },
  {
    title: 'Semester Results',
    desc: 'Grade points ledger & cumulative CGPA record',
    href: '/portal/results',
    icon: GraduationCap,
  },
  {
    title: 'Academic Calendar',
    desc: 'Official semester deadlines, key events & holiday calendar',
    href: '/portal/calendar',
    icon: PartyPopper,
  },
];

export default function PortalDashboard() {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const statusQuery = useGetPortalStatus();
  const connectMutation = useConnectPortal();
  const syncMutation = useSyncPortal();
  const disconnectMutation = useDisconnectPortal();

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [srmUsername, setSrmUsername] = useState('');
  const [srmPassword, setSrmPassword] = useState('');

  const data = statusQuery.data;

  const handleOpenConnect = () => {
    setSrmUsername('');
    setSrmPassword('');
    setShowConnectModal(true);
  };

  const handleConnectSubmit = async (e) => {
    e.preventDefault();
    if (!srmUsername.trim() || !srmPassword) {
      toast({ title: 'Validation Error', description: 'Please enter your Registration Number and Password.', variant: 'destructive' });
      return;
    }

    try {
      await connectMutation.mutateAsync({
        srmUsername: srmUsername.trim().toUpperCase(),
        srmPassword,
      });

      await refreshUser(); // refresh global auth state to populate Settings profile fields

      toast({ title: 'Portal Connected!', description: 'SRM Portal linked and data synchronized successfully.' });
      setShowConnectModal(false);
      setSrmPassword('');
    } catch (err) {
      toast({
        title: 'Connection Failed',
        description: getUserFriendlyError(err, 'portal_connect'),
        variant: 'destructive',
      });
    }
  };

  const handleSyncNow = async () => {
    try {
      await syncMutation.mutateAsync();
      toast({ title: 'Synced Successfully', description: 'Latest portal data fetched from SRM.' });
    } catch (err) {
      toast({ title: 'Sync Failed', description: getUserFriendlyError(err, 'portal_sync'), variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to unlink your SRM Portal account?')) {
      try {
        await disconnectMutation.mutateAsync();
        toast({ title: 'Disconnected', description: 'SRM Portal account unlinked.' });
      } catch (err) {
        toast({ title: 'Disconnect Failed', description: getUserFriendlyError(err, 'portal_sync'), variant: 'destructive' });
      }
    }
  };

  if (statusQuery.isLoading) {
    return (
      <Shell>
        <LoadingBlock lines={10} />
      </Shell>
    );
  }

  if (statusQuery.error) {
    return (
      <Shell>
        <QueryState error={statusQuery.error} onRetry={() => statusQuery.refetch()} label="SRM Portal" />
      </Shell>
    );
  }

  const isConnected = data?.isConnected;
  const hasStoredPortalData = data?.hasStoredPortalData || Boolean(data?.srmUsername || data?.profile?.studentName);
  const isSessionExpired = data?.connectionStatus === 'expired' || data?.isSessionExpired;
  const profile = data?.profile || {};
  const cgpa = data?.cgpa?.cgpa || '0.00';
  const attendanceList = data?.attendance || [];
  const timetableList = data?.timetable || [];
  const subjectsList = data?.subjects || [];
  const enrolledCount = data?.enrolledSubjectsCount ?? Math.max(subjectsList.length, attendanceList.length);

  const lastSynced = data?.lastSuccessfulSync
    ? new Date(data.lastSuccessfulSync).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not synced';

  return (
    <Shell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-accent">
              <GraduationCap size={16} /> SRM AP STUDENT PORTAL
            </div>
            <h1 className="font-display text-4xl font-bold">
              {hasStoredPortalData ? profile.studentName || data.srmUsername : 'Connect Portal'}
            </h1>
            {hasStoredPortalData && (
              <p className="mt-1 text-sm text-muted-foreground">
                Reg No: <span className="font-mono font-semibold text-foreground">{data.srmUsername}</span> • Last synced: {lastSynced}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasStoredPortalData ? (
              <>
                <button
                  onClick={handleSyncNow}
                  disabled={syncMutation.isPending}
                  className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  <RefreshCw size={15} className={syncMutation.isPending ? 'animate-spin' : ''} />
                  <span>{syncMutation.isPending ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10"
                >
                  <Unlink size={14} /> Unlink
                </button>
              </>
            ) : (
              <button
                onClick={handleOpenConnect}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground shadow-sm hover:opacity-90"
              >
                <LinkIcon size={16} /> Connect SRM Portal
              </button>
            )}
          </div>
        </div>

        {hasStoredPortalData ? (
          <>
            {/* Non-blocking session expired banner */}
            {isSessionExpired && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-500 font-semibold shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>Live portal session expired. Showing your last synced data.</span>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={syncMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={syncMutation.isPending ? 'animate-spin' : ''} />
                  <span>Sync Now</span>
                </button>
              </div>
            )}

            {/* Student Information */}
            <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-accent">
                <UserCheck size={16} /> STUDENT INFORMATION
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 pt-2">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Student Name</span>
                  <div className="font-bold text-base">{user?.displayName || profile.studentName || user?.name || '—'}</div>
                  {user?.displayName && profile.studentName && (
                    <div className="text-[10px] text-muted-foreground">Official SRM: {profile.studentName}</div>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Registration No</span>
                  <div className="font-mono font-bold text-base text-accent">{data.srmUsername}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Programme</span>
                  <div className="font-bold text-base">{profile.program || 'B.Tech'}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Section</span>
                  <div className="font-bold text-base">{profile.section || '—'}</div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase">Current Semester</span>
                  <div className="font-bold text-base">{formatSemester(profile.semester || 1)}</div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm space-y-1">
                <span className="font-mono text-xs font-bold uppercase text-muted-foreground">Cumulative GPA</span>
                <div className="font-display text-3xl font-bold text-amber-500">{cgpa}</div>
                <p className="text-xs text-muted-foreground">Official ledger grade point score</p>
              </div>

              <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm space-y-1">
                <span className="font-mono text-xs font-bold uppercase text-muted-foreground">Enrolled Subjects</span>
                <div className="font-display text-3xl font-bold text-accent">
                  {enrolledCount}
                </div>
                <p className="text-xs text-muted-foreground">Active course modules</p>
              </div>
            </div>

            {/* Portal Features Grid */}
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold">Portal Features</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PORTAL_FEATURES.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <Link
                      key={feat.href}
                      to={feat.href}
                      className="group rounded-2xl border border-card-border bg-card p-6 shadow-sm transition-all hover:border-accent/50 hover:shadow-md space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-accent transition-colors">{feat.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{feat.desc}</p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 font-bold text-xs text-accent pt-2">
                        <span>Open Feature</span>
                        <ChevronRight size={14} />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-card-border bg-card p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <GraduationCap size={32} />
            </div>
            <h2 className="font-display text-2xl font-bold">Connect Your SRM AP Portal</h2>
            <p className="text-sm text-muted-foreground">
              Link your student portal account to automatically sync your official attendance, timetable schedule, assessment marks, and CGPA into Study-Arena.
            </p>
            <button
              onClick={handleOpenConnect}
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-md hover:opacity-90"
            >
              <LinkIcon size={16} /> Connect SRM Portal
            </button>
          </div>
        )}

        {/* Connect Modal — Registration Number + Password only, no CAPTCHA */}
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-card-border bg-card p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <ShieldCheck size={20} className="text-accent" /> Connect SRM Portal
                </h3>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Link your SRM AP student account to automatically sync your academic data.
              </p>

              <form onSubmit={handleConnectSubmit} className="space-y-4">
                <div>
                  <label htmlFor="portal-reg-no" className="block text-xs font-semibold text-muted-foreground uppercase">
                    Registration Number
                  </label>
                  <input
                    id="portal-reg-no"
                    type="text"
                    required
                    placeholder="Enter your registration number"
                    value={srmUsername}
                    onChange={(e) => setSrmUsername(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm font-bold uppercase focus:border-accent focus:outline-none"
                    disabled={connectMutation.isPending}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label htmlFor="portal-password" className="block text-xs font-semibold text-muted-foreground uppercase">
                    Portal Password
                  </label>
                  <input
                    id="portal-password"
                    type="password"
                    required
                    placeholder="Enter your portal password"
                    value={srmPassword}
                    onChange={(e) => setSrmPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium focus:border-accent focus:outline-none"
                    disabled={connectMutation.isPending}
                    autoComplete="current-password"
                  />
                </div>

                {connectMutation.isPending && (
                  <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-3 text-xs font-semibold text-accent">
                    <Loader2 size={14} className="animate-spin" />
                    Authenticating with SRM AP portal and syncing your data…
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    disabled={connectMutation.isPending}
                    className="w-1/2 rounded-xl border border-border bg-background py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={connectMutation.isPending}
                    className="w-1/2 inline-flex items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-foreground shadow-md hover:opacity-90 disabled:opacity-50"
                  >
                    {connectMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      'Connect Portal'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

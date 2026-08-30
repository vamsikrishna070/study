import { Link } from 'react-router-dom';
import { CalendarDays, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { LoadingBlock, QueryState } from '../../components/shared.jsx';
import { useGetPortalStatus, useSyncPortal } from '../../services/portalHooks.js';
import { useToast } from '../../components/ui/use-toast.js';

export default function PortalExams() {
  const { toast } = useToast();
  const statusQuery = useGetPortalStatus();
  const syncMutation = useSyncPortal();

  const data = statusQuery.data;

  const handleSyncNow = async () => {
    try {
      await syncMutation.mutateAsync();
      toast({ title: 'SRM marks synchronized successfully.', description: 'Latest official assessment marks updated.' });
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
        <QueryState error={statusQuery.error || 'Empty'} onRetry={() => statusQuery.refetch()} label="Portal Exams" />
      </Shell>
    );
  }

  const exams = data?.exams || [];
  const lastSyncedAt = data?.lastSuccessfulSync
    ? new Date(data.lastSuccessfulSync).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not synced yet';

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/portal" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2">
              <ArrowLeft size={14} /> Back to Portal Overview
            </Link>
            <h1 className="font-display text-4xl font-bold">Exams & Assessment Marks</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Official assessment marks automatically synced from the SRM AP Student Portal.
            </p>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw size={15} className={syncMutation.isPending ? 'animate-spin' : ''} />
            <span>{syncMutation.isPending ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>

        {/* Official SRM Marks List */}
        {exams.length === 0 ? (
          <div className="rounded-2xl border border-card-border bg-card p-10 text-center text-sm text-muted-foreground">
            Marks are not available yet from the SRM AP Student Portal.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {exams.map((exam, idx) => {
              const isPublished = exam.published && exam.marks_obtained !== null && exam.marks_obtained !== undefined;
              const components = exam.components || exam.assessments || [];

              return (
                <div key={idx} className="rounded-2xl border border-card-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-accent">{exam.subject_code}</span>
                        <h3 className="font-bold text-lg">{exam.subject_name}</h3>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-500">
                        <ShieldCheck size={13} /> Official SRM Data
                      </span>
                    </div>

                    {/* Official SRM Marks Display */}
                    <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>OFFICIAL SRM MARKS</span>
                        <span className="font-mono text-[11px]">Last synced: {lastSyncedAt}</span>
                      </div>

                      {isPublished ? (
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-4xl font-bold text-foreground">{exam.marks_obtained}</span>
                          {exam.max_marks && (
                            <span className="text-sm font-semibold text-muted-foreground">/ {exam.max_marks}</span>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-500/10 p-3 text-xs font-semibold text-amber-500">
                          Marks not published by SRM yet.
                        </div>
                      )}

                      {/* Component Breakdown */}
                      {components.length > 0 && (
                        <div className="pt-2 border-t border-border/60 space-y-2">
                          <div className="font-mono text-[10px] uppercase text-muted-foreground tracking-wider font-bold">
                            Component Breakdown
                          </div>
                          <div className="space-y-1.5">
                            {components.map((comp, cIdx) => (
                              <div key={cIdx} className="flex items-center justify-between text-xs">
                                <span className="font-medium">{comp.name}</span>
                                <div className="font-mono space-x-3">
                                  {comp.conductedObtained && (
                                    <span className="text-muted-foreground">
                                      Conducted: <span className="font-bold text-foreground">{comp.conductedObtained}</span>/{comp.conductedMax || ''}
                                    </span>
                                  )}
                                  {comp.convertedObtained && (
                                    <span className="text-accent font-bold">
                                      Converted: {comp.convertedObtained}/{comp.convertedMax || ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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

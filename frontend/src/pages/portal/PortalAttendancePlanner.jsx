import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  RotateCcw,
  ArrowLeft,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Shell from '../../components/Shell.jsx';
import { LoadingBlock, QueryState, cx } from '../../components/shared.jsx';
import { useGetAttendancePlanner, useSyncPortal, useGetPortalStatus } from '../../services/portalHooks.js';
import { useToast } from '../../components/ui/use-toast.js';
import { calculateSimulation, getRiskColor } from '../../utils/attendancePlannerUtils.js';

export default function PortalAttendancePlanner() {
  const { toast } = useToast();
  const plannerQuery = useGetAttendancePlanner();
  const statusQuery = useGetPortalStatus();
  const syncMutation = useSyncPortal();

  const [simulations, setSimulations] = useState({});
  const [filterQuery, setFilterQuery] = useState('');

  const data = plannerQuery.data || {};
  const isConnected = statusQuery.data?.isConnected;
  const subjects = data.subjects || [];

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      toast({ title: 'Refreshed', description: 'Attendance planner records synchronized.' });
    } catch (err) {
      toast({ title: 'Sync Failed', description: err.message, variant: 'destructive' });
    }
  };

  const updateSimulation = (code, field, delta) => {
    setSimulations((prev) => {
      const current = prev[code] || { bunks: 0, attend: 0 };
      const currentVal = current[field] || 0;
      const nextVal = Math.max(0, currentVal + delta);
      return {
        ...prev,
        [code]: {
          ...current,
          [field]: nextVal,
        },
      };
    });
  };

  const setDirectSimulation = (code, field, val) => {
    const parsed = Math.max(0, parseInt(val, 10) || 0);
    setSimulations((prev) => {
      const current = prev[code] || { bunks: 0, attend: 0 };
      return {
        ...prev,
        [code]: {
          ...current,
          [field]: parsed,
        },
      };
    });
  };

  const resetSimulation = (code) => {
    setSimulations((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  };

  const resetAllSimulations = () => {
    setSimulations({});
    toast({ title: 'Simulations Reset', description: 'All simulated bunks and attendances have been cleared.' });
  };

  // Calculate subject simulations
  const evaluatedSubjects = useMemo(() => {
    return subjects.map((sub) => {
      const code = sub.subjectCode || sub.code;
      const sim = simulations[code] || { bunks: 0, attend: 0 };
      const conducted = Number(sub.conducted ?? sub.classes_conducted ?? 0);
      const attended = Number(sub.attended ?? sub.present ?? 0);
      const odMlPct = Number(sub.odMlPct ?? 0);

      const result = calculateSimulation({
        conducted,
        attended,
        odMlPct,
        simulatedBunks: sim.bunks,
        simulatedAttended: sim.attend,
      });

      return {
        ...sub,
        subjectCode: code,
        subjectName: sub.subjectName || sub.name || code,
        currentConducted: conducted,
        currentAttended: attended,
        currentPct: conducted > 0 ? parseFloat(((attended / conducted) * 100).toFixed(2)) : 0,
        simBunks: sim.bunks,
        simAttend: sim.attend,
        hasSimulation: sim.bunks > 0 || sim.attend > 0,
        ...result,
      };
    });
  }, [subjects, simulations]);

  // Overall aggregate stats
  const overallStats = useMemo(() => {
    let totalCurrentConducted = 0;
    let totalCurrentAttended = 0;
    let totalProjectedConducted = 0;
    let totalProjectedAttended = 0;
    let totalSafeBunksPool = 0;
    let totalAbsences = 0;

    evaluatedSubjects.forEach((sub) => {
      totalCurrentConducted += sub.currentConducted;
      totalCurrentAttended += sub.currentAttended;
      totalProjectedConducted += sub.projectedConducted;
      totalProjectedAttended += sub.projectedAttended;
      totalSafeBunksPool += sub.safeBunksRemaining;
      totalAbsences += sub.projectedAbsences;
    });

    const currentOverallPct =
      totalCurrentConducted > 0
        ? parseFloat(((totalCurrentAttended / totalCurrentConducted) * 100).toFixed(2))
        : 0;

    const projectedOverallPct =
      totalProjectedConducted > 0
        ? parseFloat(((totalProjectedAttended / totalProjectedConducted) * 100).toFixed(2))
        : 0;

    const hasAnySimulation = evaluatedSubjects.some((s) => s.hasSimulation);

    return {
      currentOverallPct,
      projectedOverallPct,
      totalSafeBunksPool,
      totalAbsences,
      hasAnySimulation,
      subjectCount: evaluatedSubjects.length,
    };
  }, [evaluatedSubjects]);

  const filteredSubjects = useMemo(() => {
    if (!filterQuery.trim()) return evaluatedSubjects;
    const q = filterQuery.toLowerCase();
    return evaluatedSubjects.filter(
      (s) =>
        s.subjectCode.toLowerCase().includes(q) ||
        s.subjectName.toLowerCase().includes(q)
    );
  }, [evaluatedSubjects, filterQuery]);

  if (plannerQuery.isLoading) {
    return (
      <Shell>
        <LoadingBlock lines={8} />
      </Shell>
    );
  }

  if (plannerQuery.error && !data.subjects) {
    return (
      <Shell>
        <QueryState
          error={plannerQuery.error || 'Failed to load attendance planner.'}
          onRetry={() => plannerQuery.refetch()}
          label="Attendance Planner"
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/portal/attendance"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mb-2"
            >
              <ArrowLeft size={14} /> Back to Attendance Details
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl sm:text-4xl font-bold">Attendance Planner</h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Calculate projected attendance and plan your classes safely above 75%.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {overallStats.hasAnySimulation && (
              <button
                onClick={resetAllSimulations}
                className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-card-border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground shadow-sm transition-all"
              >
                <RotateCcw size={13} />
                <span>Reset All</span>
              </button>
            )}

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



        {/* Search / Filter Bar */}
        {subjects.length > 3 && (
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search subject code or name..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="flex-1 rounded-xl border border-card-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        {/* Subject Simulation Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Subject Bunk Calculations</h2>
            <span className="text-xs text-muted-foreground">
              Use + / - buttons to simulate skipping or attending upcoming classes
            </span>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="rounded-2xl border border-card-border bg-card p-10 text-center text-sm text-muted-foreground">
              No subjects match your filter.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredSubjects.map((sub) => {
                const code = sub.subjectCode;
                const riskColors = getRiskColor(sub.riskTier);

                return (
                  <div
                    key={code}
                    className="rounded-[20px] border border-border/60 bg-white dark:bg-card p-5 sm:p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] space-y-5 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Code and Name */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#E25822] dark:text-orange-500">
                            {code}
                          </span>
                          {sub.hasSimulation && (
                            <button
                              onClick={() => resetSimulation(code)}
                              title="Reset simulation for this subject"
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-[#112440] dark:text-gray-100 leading-snug line-clamp-2">
                          {sub.subjectName}
                        </h3>
                      </div>

                      {/* Right: Percent and Skip Info */}
                      <div className="flex items-center gap-4 sm:gap-6 shrink-0 mt-1">
                        <span className={cx('text-2xl font-bold tracking-tight', riskColors.text)}>
                          {sub.projectedPercentage}%
                        </span>
                        
                        <div className="border-l border-border/60 pl-4 sm:pl-6 flex flex-col justify-center min-w-[75px]">
                          {sub.recoveryClassesNeeded > 0 ? (
                            <>
                              <span className="text-[12px] text-muted-foreground leading-tight mb-0.5">Attend next</span>
                              <span className="text-base font-bold text-rose-600 leading-tight">
                                {sub.recoveryClassesNeeded} class{sub.recoveryClassesNeeded === 1 ? '' : 'es'}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[12px] text-muted-foreground leading-tight mb-0.5">Can skip</span>
                              <span className={cx(
                                'text-base font-bold leading-tight',
                                sub.safeBunksRemaining > 3 ? 'text-[#059669] dark:text-emerald-500' : sub.safeBunksRemaining > 0 ? 'text-amber-500' : 'text-rose-500'
                              )}>
                                {sub.safeBunksRemaining} class{sub.safeBunksRemaining === 1 ? '' : 'es'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar with 75% Mark */}
                    <div className="space-y-2 pt-1">
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={cx('h-full transition-all duration-300 rounded-full', riskColors.bar)}
                          style={{ width: `${Math.min(sub.projectedPercentage, 100)}%` }}
                        />
                        {/* 75% Target threshold indicator */}
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-black/10 dark:bg-white/20 z-10"
                          style={{ left: '75%' }}
                          title="75% Minimum Exam Threshold"
                        />
                      </div>
                      <div className="flex justify-between text-[12px] text-muted-foreground font-medium">
                        <span>
                          Current: {sub.currentAttended}/{sub.currentConducted} ({sub.currentPct}%)
                        </span>
                        <span>
                          Projected: {sub.projectedAttended}/{sub.projectedConducted}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Simulation Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-around pt-5 pb-1 border-t border-border/40 gap-4 sm:gap-0">
                      {/* Skip Controls */}
                      <div className="flex items-center justify-between sm:justify-start sm:gap-6 w-full sm:w-auto">
                        <span className="text-[14px] font-bold text-rose-600 dark:text-rose-500">
                          Skip Classes
                        </span>
                        <div className="flex items-center gap-5">
                          <button
                            onClick={() => updateSimulation(code, 'bunks', -1)}
                            disabled={sub.simBunks <= 0}
                            className="text-rose-600 dark:text-rose-500 hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed text-xl font-medium leading-none px-2"
                          >
                            −
                          </button>
                          <span className="text-[14px] font-medium w-4 text-center text-foreground">{sub.simBunks}</span>
                          <button
                            onClick={() => updateSimulation(code, 'bunks', 1)}
                            className="text-rose-600 dark:text-rose-500 hover:opacity-70 text-xl font-medium leading-none px-2"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="hidden sm:block h-8 w-[1px] bg-border/50" />

                      {/* Attend Controls */}
                      <div className="flex items-center justify-between sm:justify-start sm:gap-6 w-full sm:w-auto">
                        <span className="text-[14px] font-bold text-[#059669] dark:text-emerald-500">
                          Attend Classes
                        </span>
                        <div className="flex items-center gap-5">
                          <button
                            onClick={() => updateSimulation(code, 'attend', -1)}
                            disabled={sub.simAttend <= 0}
                            className="text-[#059669] dark:text-emerald-500 hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed text-xl font-medium leading-none px-2"
                          >
                            −
                          </button>
                          <span className="text-[14px] font-medium w-4 text-center text-foreground">{sub.simAttend}</span>
                          <button
                            onClick={() => updateSimulation(code, 'attend', 1)}
                            className="text-[#059669] dark:text-emerald-500 hover:opacity-70 text-xl font-medium leading-none px-2"
                          >
                            +
                          </button>
                        </div>
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

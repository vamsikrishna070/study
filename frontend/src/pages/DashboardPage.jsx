import { Link } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  Flame,
  FolderOpen,
  GraduationCap,
  Plus,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useGetDashboard } from "../services/apiHooks.js";
import { useAuth } from "../context/AuthContext.jsx";
import Shell from "../components/Shell.jsx";
import {
  LoadingBlock,
  QueryState,
  cx,
  fmtDate,
} from "../components/shared.jsx";
import TodayAttendanceCard from "../components/dashboard/TodayAttendanceCard.jsx";
import TodayTimetableCard from "../components/dashboard/TodayTimetableCard.jsx";

export function DashboardPage() {
  const { user: authUser } = useAuth();
  const query = useGetDashboard();
  const data = query.data;
  if (query.isLoading)
    return (
      <Shell>
        <LoadingBlock lines={7} />
      </Shell>
    );
  if (query.error || !data)
    return (
      <Shell>
        <QueryState
          error={query.error || "empty"}
          onRetry={() => query.refetch()}
          label="Dashboard"
        />
      </Shell>
    );

  const {
    user: dashboardUser,
    stats = {},
    subjects = [],
    upcomingExams = [],
    todayTasks = [],
    recentActivity = [],
    dayName,
  } = data || {};

  const user = dashboardUser || authUser || {};
  const displayName = user?.displayName || user?.officialName || user?.name || 'Scholar';
  const firstName = displayName.split(" ")[0] || "Scholar";
  const initial = displayName.charAt(0).toUpperCase() || "S";

  return (
    <Shell>
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.22em] text-accent">
              {dayName || "Today"},{" "}
              {new Intl.DateTimeFormat("en-IN", {
                day: "numeric",
                month: "long",
              }).format(new Date())}
            </p>
            <h1 className="mt-2 flex items-center gap-4 font-display text-5xl leading-[.95] tracking-tight sm:text-6xl">
              {user?.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover shadow-sm border border-border sm:h-[4.5rem] sm:w-[4.5rem]"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-2xl font-bold text-accent shadow-sm border border-accent/20 sm:h-[4.5rem] sm:w-[4.5rem]">
                  {initial}
                </div>
              )}
              <div>
                Hi,
                <span className="text-accent">
                  {" "}
                  {firstName}.
                </span>
              </div>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
              Your semester at a glance. Keep the next right thing visible.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/notes"
              className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold hover:bg-muted"
              data-testid="link-quick-note"
            >
              <FileText size={16} /> Capture a note
            </Link>
            <Link
              to="/tasks"
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
              data-testid="link-quick-task"
            >
              <Plus size={16} /> Add a task
            </Link>
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Semester progress",
              value: `${stats.overallProgress}%`,
              icon: TrendingUp,
              note: "across all subjects",
              color: "text-accent",
            },
            {
              label: "Study hours",
              value: `${stats.studyHours}h`,
              icon: Clock3,
              note: "logged this week",
              color: "text-[#b58a4a]",
            },
            {
              label: "Current streak",
              value: `${user?.currentStreak || stats.streak || 0} ${user?.currentStreak === 1 || stats.streak === 1 ? 'day' : 'days'}`,
              icon: Flame,
              note: "keep it going",
              color: "text-accent",
            },
            {
              label: "Credits in play",
              value: stats.totalCredits,
              icon: GraduationCap,
              note: `${stats.totalSubjects} subjects`,
              color: "text-[#7382a5]",
            },
          ].map(({ label, value, icon: Icon, note, color }, i) => (
            <div
              key={label}
              className="card-lift rounded-2xl border border-card-border bg-card p-5"
              data-testid={`stat-card-${i}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">
                  {label}
                </span>
                <Icon size={17} className={color} />
              </div>
              <div className="mt-4 font-display text-4xl">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <TodayAttendanceCard />
          <TodayTimetableCard />
        </section>
        <div className="grid gap-6 xl:grid-cols-[1.35fr_.9fr]">
          <section className="rounded-2xl border border-card-border bg-card p-6 sm:p-7">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">
                  The landscape
                </p>
                <h2 className="mt-1 font-display text-3xl">Your subjects</h2>
              </div>
              <Link
                to="/subjects"
                className="text-xs font-bold text-accent hover:underline"
                data-testid="link-view-subjects"
              >
                View all <ArrowUpRight size={13} className="inline" />
              </Link>
            </div>
            <div className="space-y-5">
              {subjects.slice(0, 5).map((subject) => (
                <div
                  key={subject.id}
                  className="group"
                  data-testid={`subject-progress-${subject.id}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="text-sm font-bold">{subject.name}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {subject.code}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {subject.progress}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${subject.progress}%`,
                        backgroundColor: subject.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-card-border bg-primary p-6 text-primary-foreground sm:p-7">
            <div className="flex items-center gap-2 text-sidebar-primary">
              <CalendarDays size={16} />
              <span className="font-mono text-[10px] uppercase tracking-[.18em]">
                Coming up
              </span>
            </div>
            <h2 className="mt-2 font-display text-3xl">Exam watch</h2>
            <div className="mt-6 space-y-4">
              {upcomingExams.slice(0, 3).map((exam) => (
                <div
                  key={exam.id}
                  className="border-b border-primary-foreground/15 pb-4 last:border-0"
                  data-testid={`exam-watch-${exam.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{exam.name}</p>
                      <p className="mt-1 text-xs text-primary-foreground/60">
                        {exam.subject} · {fmtDate(exam.date)}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent px-2 py-1 font-mono text-[10px] font-bold text-accent-foreground">
                      {exam.daysLeft}d
                    </span>
                  </div>
                </div>
              ))}
              {upcomingExams.length === 0 && (
                <p className="text-sm text-primary-foreground/60">
                  No exams on the horizon. Nice.
                </p>
              )}
            </div>
            <Link
              to="/exams"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-sidebar-primary"
              data-testid="link-view-exams"
            >
              Open exam plan <ArrowUpRight size={13} />
            </Link>
          </section>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr_.8fr]">
          <section className="rounded-2xl border border-card-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">
                  Today
                </p>
                <h2 className="mt-1 font-display text-2xl">Study queue</h2>
              </div>
              <Link
                to="/tasks"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                data-testid="link-tasks-arrow"
              >
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="space-y-3">
              {todayTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-xl bg-background p-3"
                  data-testid={`today-task-${task.id}`}
                >
                  <div
                    className={cx(
                      "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border",
                      task.status === "completed"
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-muted-foreground/40",
                    )}
                  >
                    {task.status === "completed" && <Check size={11} />}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cx(
                        "text-sm font-semibold",
                        task.status === "completed" &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {task.subject} · {task.duration} min
                    </p>
                  </div>
                </div>
              ))}
              {todayTasks.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Your queue is clear. Add something meaningful.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-card-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">
                  Timeline
                </p>
                <h2 className="mt-1 font-display text-2xl">Recent activity</h2>
              </div>
              <Activity size={17} className="text-muted-foreground" />
            </div>
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3"
                  data-testid={`activity-${item.id}`}
                >
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent/70" />
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.detail} · {item.time}
                    </p>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Your study story starts here.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-accent/20 bg-accent/10 p-6">
            <Zap size={19} className="text-accent" />
            <h2 className="mt-4 font-display text-2xl">Make it count</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A quick capture now saves a frantic search before exams.
            </p>
            <div className="mt-5 space-y-2">
              <Link
                to="/notes"
                className="flex items-center justify-between rounded-xl bg-card px-3 py-3 text-xs font-bold hover:bg-background"
                data-testid="link-capture-note"
              >
                <span>
                  <FileText size={14} className="mr-2 inline text-accent" />
                  Capture note
                </span>
                <ChevronRight size={14} />
              </Link>
              <Link
                to="/resources"
                className="flex items-center justify-between rounded-xl bg-card px-3 py-3 text-xs font-bold hover:bg-background"
                data-testid="link-save-resource"
              >
                <span>
                  <FolderOpen size={14} className="mr-2 inline text-accent" />
                  Save resource
                </span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}

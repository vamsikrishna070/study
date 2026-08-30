import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { History, Play, PenLine, Smile, Meh, Frown, Trash2, Clock, BookOpen, Target, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getGetStudySessionsQueryKey, useGetStudySessions, useDeleteStudySession } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, LoadingBlock, PageHeading, QueryState, Modal } from '../components/shared.jsx';

export default function StudyLogPage() {
  const qc = useQueryClient();
  const query = useGetStudySessions({ limit: 100 });
  const sessions = query.data || [];
  const del = useDeleteStudySession();
  const [selectedSession, setSelectedSession] = useState(null);

  const handleDelete = (session) => {
    if (confirm('Delete this study session? This will remove the session from your history.')) {
      del.mutate({ id: session._id || session.id }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetStudySessionsQueryKey() });
          setSelectedSession(null);
        }
      });
    }
  };

  const formatDuration = (minutes = 0) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return `${hrs} hr`;
    return `${hrs} hr ${rem} min`;
  };

  const groupSessionsByDate = (list) => {
    const groups = {};
    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    list.forEach((session) => {
      const sDate = session.startedAt ? new Date(session.startedAt) : new Date();
      const dateStr = sDate.toDateString();
      let header = dateStr;

      if (dateStr === todayStr) {
        header = 'Today';
      } else if (dateStr === yesterdayStr) {
        header = 'Yesterday';
      } else {
        header = sDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: sDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
      }

      if (!groups[header]) {
        groups[header] = [];
      }
      groups[header].push(session);
    });

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  };

  const groupedSessions = groupSessionsByDate(sessions);

  const getProductivityBadge = (rating) => {
    switch (rating) {
      case 'productive':
        return { label: 'Productive', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400', icon: Smile };
      case 'average':
        return { label: 'Average', color: 'text-muted-foreground bg-muted border-border', icon: Meh };
      case 'difficult':
        return { label: 'Difficult', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400', icon: Frown };
      default:
        return null;
    }
  };

  const ActionButtons = (
    <div className="flex gap-3">
      <Link to="/study-session">
        <Button className="h-10 text-xs">
          <Play size={14} className="fill-current mr-1" /> Start Timer
        </Button>
      </Link>
    </div>
  );

  return (
    <Shell>
      <PageHeading
        eyebrow="Activity Record"
        title="Study Log"
        detail="Every focused hour, tracked and organized by subject and topic."
        action={ActionButtons}
      />

      {query.isLoading ? (
        <LoadingBlock lines={6} />
      ) : query.error ? (
        <QueryState error={query.error} onRetry={() => query.refetch()} label="Study Sessions" />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No study sessions yet"
          detail="Start a focus timer session or log your hours to see your study record here."
          action={
            <Link to="/study-session">
              <Button>
                <Play size={15} className="fill-current mr-1" /> Start Studying
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {groupedSessions.map((group) => {
            const groupMinutes = group.data.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
            return (
              <section key={group.title} className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-border/60 pb-2">
                  <h3 className="font-display text-lg font-semibold text-foreground">{group.title}</h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {group.data.length} session{group.data.length > 1 ? 's' : ''} • {formatDuration(groupMinutes)}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.data.map((session) => {
                    const subName = session.subject?.name || session.subjectName || 'General Study';
                    const subColor = session.subject?.color || '#7382a5';
                    const prodBadge = getProductivityBadge(session.productivity);

                    return (
                      <article
                        key={session._id || session.id}
                        onClick={() => setSelectedSession(session)}
                        className="card-lift flex cursor-pointer gap-4 rounded-2xl border border-card-border bg-card p-5 relative overflow-hidden"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5"
                          style={{ backgroundColor: subColor }}
                        />
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-semibold text-sm line-clamp-1">{subName}</h4>
                              {session.topic && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{session.topic}</p>
                              )}
                            </div>
                            <span className="shrink-0 font-mono text-xs font-bold text-foreground">
                              {formatDuration(session.durationMinutes || 0)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-secondary-foreground uppercase">
                                {session.sessionType === 'manual' ? 'Manual' : 'Timer'}
                              </span>

                              {prodBadge && (
                                <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${prodBadge.color}`}>
                                  <prodBadge.icon size={10} />
                                  {prodBadge.label}
                                </span>
                              )}
                            </div>

                            <span className="font-mono text-[10px] text-muted-foreground">
                              {new Date(session.startedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <Modal
          title="Session Details"
          eyebrow="Activity Record"
          onClose={() => setSelectedSession(null)}
          footer={
            <div className="flex justify-between items-center w-full">
              <Button
                variant="danger"
                onClick={() => handleDelete(selectedSession)}
                disabled={del.isPending}
                className="h-10 text-xs"
              >
                <Trash2 size={14} className="mr-1" /> {del.isPending ? 'Deleting…' : 'Delete Record'}
              </Button>
              <Button variant="quiet" onClick={() => setSelectedSession(null)} className="h-10 text-xs">
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl bg-background p-4 border border-border">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <BookOpen size={10} /> Subject
                </p>
                <p className="mt-1 font-semibold text-sm">
                  {selectedSession.subject?.name || selectedSession.subjectName || 'General Study'}
                </p>
              </div>

              <div className="rounded-xl bg-background p-4 border border-border">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock size={10} /> Duration
                </p>
                <p className="mt-1 font-semibold text-sm">
                  {formatDuration(selectedSession.durationMinutes || 0)}
                </p>
              </div>
            </div>

            {selectedSession.topic && (
              <div className="rounded-xl bg-background p-4 border border-border">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Target size={10} /> Topic
                </p>
                <p className="mt-1 font-semibold text-sm">{selectedSession.topic}</p>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl bg-background p-4 border border-border">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Started At</p>
                <p className="mt-1 text-xs font-medium">
                  {new Date(selectedSession.startedAt).toLocaleString()}
                </p>
              </div>

              {selectedSession.sessionType && (
                <div className="rounded-xl bg-background p-4 border border-border">
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Session Type & Productivity</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-secondary-foreground uppercase">
                      {selectedSession.sessionType === 'manual' ? 'Manual Log' : 'Active Timer'}
                    </span>
                    {getProductivityBadge(selectedSession.productivity) && (
                      <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getProductivityBadge(selectedSession.productivity).color}`}>
                        {selectedSession.productivity}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedSession.goal && (
              <div className="rounded-xl bg-background p-4 border border-border">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Session Goal</p>
                <p className="mt-1 text-xs whitespace-pre-wrap leading-relaxed">{selectedSession.goal}</p>
              </div>
            )}

            {selectedSession.notes && (
              <div className="rounded-xl bg-background p-4 border border-border">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <FileText size={10} /> Accomplishments & Notes
                </p>
                <p className="mt-1 text-xs whitespace-pre-wrap leading-relaxed">{selectedSession.notes}</p>
              </div>
            )}

            {selectedSession.task?.title && (
              <div className="rounded-xl bg-background p-4 border border-border">
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Linked Task</p>
                <p className="mt-1 text-xs font-medium">{selectedSession.task.title}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </Shell>
  );
}

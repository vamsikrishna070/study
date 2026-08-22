import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { getGetDashboardQueryKey, getGetSubjectsQueryKey, useDeleteSubject, useGetSubjects } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, LoadingBlock, PageHeading, QueryState } from '../components/shared.jsx';
import SubjectModal from '../components/subjects/SubjectModal.jsx';

export function SubjectsPage() {
  const query = useGetSubjects();
  const data = query.data;
  const del = useDeleteSubject();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(undefined);
  const [open, setOpen] = useState(false);

  const remove = (s) => {
    if (confirm(`Delete "${s.name}"? This cannot be undone.`)) {
      del.mutate({ id: s.id || s._id }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSubjectsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        }
      });
    }
  };

  return (
    <Shell>
      <PageHeading
        eyebrow="The curriculum"
        title="Subjects"
        detail="Your semester, broken into things you can actually move forward."
        action={
          <Button onClick={() => { setEditing(undefined); setOpen(true); }} testId="button-add-subject">
            <Plus size={16} /> Add Subject
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingBlock lines={6} />
      ) : query.error ? (
        <QueryState error={query.error} onRetry={() => query.refetch()} label="Subjects" />
      ) : !data?.length ? (
        <EmptyState
          icon={BookOpen}
          title="A blank semester"
          detail="Add your first subject to start mapping your workload."
          action={<Button onClick={() => setOpen(true)} testId="button-empty-add-subject"><Plus size={16} /> Add Subject</Button>}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map(s => {
            const subjId = s.id || s._id;
            return (
              <article className="card-lift relative overflow-hidden rounded-2xl border border-card-border bg-card p-6" key={subjId} data-testid={`card-subject-${subjId}`}>
                <div className="absolute left-0 top-0 h-1 w-full" style={{ backgroundColor: s.color }} />
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-medium tracking-[.16em] text-muted-foreground">{s.code} / {s.credits} CREDITS</span>
                    <Link to={`/subjects/${subjId}`} className="block hover:text-accent transition-colors">
                      <h2 className="mt-2 font-display text-3xl hover:underline">{s.name}</h2>
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{s.faculty || 'Faculty not set'} · Semester {s.semester}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(s); setOpen(true); }} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" data-testid={`button-edit-subject-${subjId}`}>
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => remove(s)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-subject-${subjId}`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p className="mt-5 min-h-10 text-sm leading-5 text-muted-foreground">
                  {s.description || 'No description yet. Add a little context to make this subject yours.'}
                </p>
                <div className="mt-6 flex items-center justify-between text-xs">
                  <span className="font-semibold">Progress</span>
                  <span className="font-mono text-muted-foreground">{s.progress}%</span>
                </div>
                <div className="mt-2 progress-track">
                  <div className="progress-fill" style={{ width: `${s.progress}%`, backgroundColor: s.color }} />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>{s.topicsCompleted ?? 0} / {s.topicsTotal ?? 0} topics</span>
                  <span>{s.examDaysLeft >= 0 ? `${s.examDaysLeft} days to exam` : 'Exam date unset'}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && <SubjectModal initial={editing} onClose={() => setOpen(false)} />}
    </Shell>
  );
}

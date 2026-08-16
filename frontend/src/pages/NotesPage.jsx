import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { getGetNotesQueryKey, useDeleteNote, useGetNotes, useGetSubjects } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, LoadingBlock, PageHeading, QueryState, cx, inputClass } from '../components/shared.jsx';
import NoteCard from '../components/notes/NoteCard.jsx';
import NoteModal from '../components/notes/NoteModal.jsx';

const PRIORITIES = [
  { value: '', label: 'All priorities' },
  { value: 'exam', label: 'Exam essential' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function NotesPage() {
  const qc = useQueryClient();
  const subjectsQuery = useGetSubjects();
  const subjects = subjectsQuery.data || [];

  const [search, setSearch] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState(undefined);
  const [open, setOpen] = useState(false);

  const params = {
    ...(search ? { search } : {}),
    ...(filterSubjectId ? { subjectId: filterSubjectId } : {}),
    ...(filterPriority ? { priority: filterPriority } : {}),
  };

  const query = useGetNotes(params);
  const notes = query.data;
  const del = useDeleteNote();

  const remove = (n) => {
    if (confirm(`Delete "${n.title}"? This cannot be undone.`)) {
      del.mutate({ id: n.id }, {
        onSuccess: () => qc.invalidateQueries({ queryKey: getGetNotesQueryKey() })
      });
    }
  };

  const hasFilters = filterSubjectId || filterPriority;
  const clearFilters = () => {
    setFilterSubjectId('');
    setFilterPriority('');
    setSearch('');
  };

  return (
    <Shell>
      <PageHeading
        eyebrow="Your knowledge base"
        title="Notes"
        detail="Capture ideas, explanations, formulas, and key concepts."
        action={
          <Button onClick={() => { setEditing(undefined); setOpen(true); }} testId="button-add-note">
            <Plus size={16} /> Add Note
          </Button>
        }
      />

      {/* Search + Filter bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className={cx(inputClass, 'pl-10')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search titles, content, tags…"
              data-testid="input-search-notes"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={15} />
              </button>
            )}
          </div>
          <Button
            variant="quiet"
            onClick={() => setFiltersOpen(f => !f)}
            className={cx(hasFilters && 'border-accent text-accent')}
          >
            <SlidersHorizontal size={15} />
            Filters
            {hasFilters && <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground">!</span>}
          </Button>
        </div>

        {filtersOpen && (
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Subject</label>
              <select className={inputClass} value={filterSubjectId} onChange={e => setFilterSubjectId(e.target.value)} data-testid="select-filter-notes">
                <option value="">All subjects</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Priority</label>
              <select className={inputClass} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {hasFilters && (
              <Button variant="quiet" onClick={clearFilters} className="shrink-0">
                <X size={14} /> Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {query.isLoading ? (
        <LoadingBlock lines={6} />
      ) : query.error ? (
        <QueryState error={query.error} onRetry={() => query.refetch()} label="Notes" />
      ) : !notes?.length ? (
        <EmptyState
          icon={FileText}
          title={search || hasFilters ? 'No notes found' : 'No notes yet'}
          detail={
            search || hasFilters
              ? 'Try a different search or clear the filters.'
              : 'Capture your first idea, explanation, formula, or important concept.'
          }
          action={
            !(search || hasFilters) && (
              <Button onClick={() => setOpen(true)} testId="button-empty-add-note">
                <Plus size={16} /> Add Note
              </Button>
            )
          }
        />
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">{notes.length} note{notes.length !== 1 ? 's' : ''}</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {notes.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                onEdit={() => { setEditing(n); setOpen(true); }}
                onDelete={() => remove(n)}
              />
            ))}
          </div>
        </>
      )}

      {open && <NoteModal initial={editing} onClose={() => { setOpen(false); setEditing(undefined); }} />}
    </Shell>
  );
}

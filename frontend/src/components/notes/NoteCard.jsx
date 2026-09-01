import { Pencil, Trash2, Paperclip, Calendar, Tag, BookOpen } from 'lucide-react';
import { cx, fmtDate } from '../shared.jsx';

const PRIORITY_STYLES = {
  exam: 'bg-red-500/15 text-red-600 dark:text-red-400',
  high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  medium: 'bg-accent/15 text-accent',
  low: 'bg-secondary text-muted-foreground',
};

const PRIORITY_LABELS = {
  exam: 'Exam essential',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export default function NoteCard({ note, onEdit, onDelete }) {
  const preview = note.content?.slice(0, 160) + (note.content?.length > 160 ? '…' : '');
  const displaySubject = note.customSubject || note.subject?.name || note.subject;

  return (
    <article className="card-lift group flex flex-col rounded-2xl border border-card-border bg-card p-5 transition-all" data-testid={`card-note-${note.id || note._id}`}>

      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider', PRIORITY_STYLES[note.priority] || PRIORITY_STYLES.medium)}>
          {PRIORITY_LABELS[note.priority] || note.priority}
        </span>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            data-testid={`button-edit-note-${note.id || note._id}`}
            aria-label="Edit note"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            data-testid={`button-delete-note-${note.id || note._id}`}
            aria-label="Delete note"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <h2 className="font-display text-xl leading-tight">{note.title}</h2>

      {preview ? (
        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground line-clamp-3">{preview}</p>
      ) : (
        <p className="mt-2 flex-1 text-xs italic text-muted-foreground/60">No additional note text</p>
      )}

      {note.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.slice(0, 4).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              <Tag size={9} />
              {tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{note.tags.length - 4} more</span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-end justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
        <div className="flex flex-col gap-1">
          {displaySubject && (
            <span className="flex items-center gap-1">
              <BookOpen size={10} />
              <span className="font-semibold text-foreground truncate max-w-[130px]">{displaySubject}</span>
              {note.topic && <span className="truncate max-w-[90px]"> · {note.topic}</span>}
            </span>
          )}
          {note.attachments?.length > 0 && (
            <span className="flex items-center gap-1 text-accent">
              <Paperclip size={10} />
              {note.attachments.length} attachment{note.attachments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
          <Calendar size={10} />
          {fmtDate(note.updatedAt || note.createdAt)}
        </span>
      </div>
    </article>
  );
}

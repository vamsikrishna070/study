import { Pencil, Trash2, Paperclip, Calendar, Tag, BookOpen } from 'lucide-react';
import { cx, fmtDate } from '../shared.jsx';
import AttachmentCard from '../shared/AttachmentCard.jsx';

const PRIORITY_STYLES = {
  exam: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20',
  high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20',
  medium: 'bg-accent/15 text-accent border-accent/20',
  low: 'bg-secondary text-muted-foreground border-border',
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
  const attachments = note.attachments || [];

  return (
    <article className="card-lift group flex flex-col rounded-2xl border border-card-border bg-card p-5 transition-all shadow-sm hover:border-accent/30" data-testid={`card-note-${note.id || note._id}`}>

      
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider border', PRIORITY_STYLES[note.priority] || PRIORITY_STYLES.medium)}>
          {PRIORITY_LABELS[note.priority] || note.priority}
        </span>
        <div className="flex shrink-0 gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            data-testid={`button-edit-note-${note.id || note._id}`}
            aria-label="Edit note"
            title="Edit note"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            data-testid={`button-delete-note-${note.id || note._id}`}
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <h2 className="font-display text-lg font-bold leading-snug text-foreground">{note.title}</h2>

      {preview ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-3">{preview}</p>
      ) : (
        <p className="mt-2 text-xs italic text-muted-foreground/60">No additional note text</p>
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
            <span className="text-[10px] text-muted-foreground font-mono">+{note.tags.length - 4} more</span>
          )}
        </div>
      )}

      {/* Attachments Section */}
      {attachments.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-border/80 pt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5 font-semibold text-accent uppercase tracking-wider text-[10px]">
              <Paperclip size={11} />
              Attachments ({attachments.length})
            </span>
          </div>
          <div className="space-y-2">
            {attachments.map((att, idx) => (
              <AttachmentCard key={att.id || att.publicId || idx} attachment={att} readonly />
            ))}
          </div>
        </div>
      )}

      
      <div className="mt-auto flex items-end justify-between border-t border-border pt-3 mt-4 text-[11px] text-muted-foreground">
        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
          {displaySubject && (
            <span className="flex items-center gap-1 min-w-0">
              <BookOpen size={10} className="shrink-0" />
              <span className="font-semibold text-foreground truncate max-w-[140px]">{displaySubject}</span>
              {note.topic && <span className="truncate max-w-[100px] text-muted-foreground"> · {note.topic}</span>}
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

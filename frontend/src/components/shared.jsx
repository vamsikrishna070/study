import { X } from 'lucide-react';

export const colors = ['#d46c52', '#4b8f8b', '#b58a4a', '#7382a5', '#8d6b8d', '#78936f'];

export const fmtDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(parsed);
};

export const fmtFullDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(parsed);
};

export const today = () => new Date().toISOString().slice(0, 10);
export const cx = (...classes) => classes.filter(Boolean).join(' ');

export function LoadingBlock({ lines = 4 }) {
  return <div className="space-y-3 animate-pulse" data-testid="loading-skeleton">{Array.from({ length: lines }).map((_, i) => <div key={i} className={cx('h-4 rounded bg-muted', i === 0 ? 'w-1/3' : i === lines - 1 ? 'w-2/3' : 'w-full')} />)}</div>;
}

export function QueryState({ error, onRetry, label = 'This section' }) {
  if (!error) return null;
  return <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center" data-testid="status-error">
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive"><X size={18} /></div>
    <p className="font-semibold">{label} could not load</p><p className="mt-1 text-sm text-muted-foreground">Check your connection and try once more.</p>
    <button onClick={onRetry} className="focus-ring mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="button-retry">Try again</button>
  </div>;
}

export function EmptyState({ icon: Icon, title, detail, action }) {
  return <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center" data-testid="empty-state">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><Icon size={21} /></div>
    <h3 className="font-display text-2xl">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}
  </div>;
}

export function Button({ children, variant = 'primary', onClick, type = 'button', disabled, className = '', testId, ...props }) {
  const hasCustomPadding = /\b(p|px|py)-/.test(className);
  const hasCustomRadius = /\brounded-/.test(className);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={cx(
        'focus-ring inline-flex items-center justify-center transition-all disabled:cursor-not-allowed disabled:opacity-50',
        !hasCustomPadding && 'px-4 py-2.5 text-sm font-bold gap-2',
        !hasCustomRadius && 'rounded-xl',
        variant === 'primary' && 'bg-primary text-primary-foreground hover:opacity-90',
        variant === 'quiet' && 'border border-border bg-card text-foreground hover:bg-muted',
        variant === 'danger' && 'bg-destructive/10 text-destructive hover:bg-destructive/15',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ title, eyebrow, onClose, children, footer, onSubmit }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const Wrapper = onSubmit ? 'form' : 'div';

  const modalContent = (
    <div className="modal-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" data-testid="dialog-form" onClick={onClose}>
      <Wrapper
        onSubmit={onSubmit}
        className="flex max-h-[calc(100dvh-32px)] w-full max-w-[700px] flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-border px-6 py-5 sm:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">{eyebrow || 'StudyArena'}</p>
            <h2 className="mt-1 font-display text-3xl">{title}</h2>
          </div>
          <button type="button" className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-muted" onClick={onClose} data-testid="button-close-dialog">
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-muted/20 px-6 py-5 sm:px-8">
            {footer}
          </div>
        )}
      </Wrapper>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export function Field({ label, children, hint }) {
  return <label className="block space-y-2"><span className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span>{children}{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</label>;
}

export const inputClass = 'focus-ring w-full min-h-[44px] rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-accent';

export function PageHeading({eyebrow,title,detail,action}) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-accent">{eyebrow}</p><h1 className="mt-2 font-display text-5xl tracking-tight">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p></div>{action}</div>;
}

export function ChartCard({title,eyebrow,children}){
  return <section className="rounded-2xl border border-card-border bg-card p-6"><p className="font-mono text-[10px] uppercase tracking-widest text-accent">{eyebrow}</p><h2 className="mt-1 font-display text-2xl">{title}</h2><div className="mt-6">{children}</div></section>;
}

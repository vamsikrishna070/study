import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Plus, Trash2, Clock, CalendarDays, Repeat } from 'lucide-react';
import { getGetRemindersQueryKey, useCreateReminder, useDeleteReminder, useGetReminders, useUpdateReminder, useGetSubjects } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, Field, LoadingBlock, Modal, PageHeading, QueryState, cx, inputClass } from '../components/shared.jsx';

// Simple formatter for dates
const fmtDateStr = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function ReminderForm({ initial, onClose }) {
  const qc = useQueryClient();
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const subjectsQuery = useGetSubjects();
  const subjects = subjectsQuery.data || [];
  
  // Convert initial remindAt Date to local datetime-local string
  const getLocalDatetimeStr = (dateVal) => {
    if (!dateVal) {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }
    const d = new Date(dateVal);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    scheduleType: initial?.scheduleType || 'one-time',
    category: initial?.category || 'general',
    priority: initial?.priority || 'medium',
    remindAt: getLocalDatetimeStr(initial?.remindAt),
    subject: initial?.subject || ''
  });
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const submit = (e) => {
    e.preventDefault();
    // Reconstruct payload
    const payload = {
      ...form,
      remindAt: new Date(form.remindAt).toISOString(), // UTC ISO String for backend
    };
    if (!payload.subject) delete payload.subject; // Remove empty subject

    const done = () => {
      qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() });
      onClose();
    };
    
    initial 
      ? update.mutate({ id: initial.id || initial._id, data: payload }, { onSuccess: done })
      : create.mutate({ data: payload }, { onSuccess: done });
  };

  return (
    <form id="reminder-form" onSubmit={submit} className="flex h-full flex-col">
      <Modal 
        title={initial ? 'Edit reminder' : 'Set a reminder'} 
        eyebrow="Don't rely on memory" 
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="reminder-form" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Saving...' : 'Save reminder'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="What to remember">
            <input required className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Register for next semester" />
          </Field>

          <Field label="Description (Optional)">
            <textarea className={cx(inputClass, 'min-h-[60px] resize-y')} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Additional context..." />
          </Field>
          
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="When">
              <input required type="datetime-local" className={inputClass} value={form.remindAt} onChange={e => set('remindAt', e.target.value)} />
            </Field>
            <Field label="Schedule Type">
              <select className={inputClass} value={form.scheduleType} onChange={e => set('scheduleType', e.target.value)}>
                <option value="one-time">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="general">General</option>
                <option value="study">Study</option>
                <option value="exam">Exam</option>
                <option value="assignment">Assignment</option>
              </select>
            </Field>
            
            <Field label="Priority">
              <select className={inputClass} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>

            <Field label="Link to Subject">
              <select className={inputClass} value={form.subject} onChange={e => set('subject', e.target.value)}>
                <option value="">None</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.code}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </Modal>
    </form>
  );
}

export default function Reminders() {
  const query = useGetReminders();
  const reminders = query.data || [];
  const del = useDeleteReminder();
  const update = useUpdateReminder();
  const qc = useQueryClient();
  
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState();
  const [filter, setFilter] = useState('upcoming'); // upcoming | recurring | completed

  const remove = (rem) => {
    if (confirm(`Delete "${rem.title}"?`)) {
      del.mutate({ id: rem._id || rem.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() }) });
    }
  };

  const toggleStatus = (rem) => {
    const enabled = !rem.enabled;
    update.mutate({ id: rem._id || rem.id, data: { enabled } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() }) });
  };

  // Grouping
  const now = new Date();
  
  // Upcoming = Enabled & One-Time & Future
  // Recurring = Enabled & (Daily or Weekly)
  // Completed = Disabled (or past one-time)
  
  const upcoming = reminders.filter(r => r.enabled && r.scheduleType === 'one-time');
  const recurring = reminders.filter(r => r.enabled && r.scheduleType !== 'one-time');
  const completed = reminders.filter(r => !r.enabled);

  const getPriorityColor = (p) => {
    if (p === 'high') return 'text-destructive';
    if (p === 'medium') return 'text-accent';
    return 'text-muted-foreground';
  };

  let displayed = [];
  if (filter === 'upcoming') displayed = upcoming;
  if (filter === 'recurring') displayed = recurring;
  if (filter === 'completed') displayed = completed;

  return (
    <Shell>
      <PageHeading 
        eyebrow="Gentle nudges" 
        title="Reminders" 
        detail="Offload your future self's responsibilities here."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16}/> Add reminder</Button>}
      />

      {/* FILTER TABS */}
      <div className="mb-6 flex space-x-1 rounded-xl bg-muted/50 p-1 w-fit">
        <button
          onClick={() => setFilter('upcoming')}
          className={cx("rounded-lg px-4 py-2 text-sm font-semibold transition-all", filter === 'upcoming' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setFilter('recurring')}
          className={cx("rounded-lg px-4 py-2 text-sm font-semibold transition-all", filter === 'recurring' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Recurring ({recurring.length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={cx("rounded-lg px-4 py-2 text-sm font-semibold transition-all", filter === 'completed' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Completed
        </button>
      </div>

      {query.isLoading ? <LoadingBlock lines={5}/> : 
       query.error ? <QueryState error={query.error} onRetry={() => query.refetch()} label="Reminders"/> : 
       !displayed.length ? (
         <EmptyState 
           icon={filter === 'recurring' ? Repeat : filter === 'completed' ? Check : Bell} 
           title={`No ${filter} reminders`} 
           detail="Nothing to see here right now." 
           action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} /> Set a reminder</Button>}
         />
       ) : (
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
           {displayed.map(r => (
             <div key={r._id || r.id} className={cx("card-lift flex flex-col gap-3 rounded-xl border p-4 transition-all", !r.enabled ? "border-border bg-background/50 opacity-70" : "border-card-border bg-card")}>
               <div className="flex items-start gap-4">
                 <button onClick={() => toggleStatus(r)} className={cx("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors", r.enabled ? "border-muted-foreground/35 hover:border-accent" : "border-accent bg-accent text-accent-foreground")}>
                   {!r.enabled && <Check size={12} />}
                 </button>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-2">
                     <span className={cx("rounded px-1.5 py-0.5 font-mono text-[9px] uppercase bg-secondary text-muted-foreground")}>{r.category}</span>
                     <div className="flex gap-2">
                       <button onClick={() => { setEditing(r); setOpen(true); }} className="text-muted-foreground hover:text-foreground text-[10px] uppercase font-mono tracking-widest font-semibold">Edit</button>
                       <button onClick={() => remove(r)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13}/></button>
                     </div>
                   </div>
                   <h4 className={cx("mt-2 font-bold leading-tight", !r.enabled && "line-through")}>{r.title}</h4>
                   {r.description && <p className="mt-1 text-xs text-muted-foreground truncate">{r.description}</p>}
                 </div>
               </div>
               
               <div className="mt-auto pt-2 border-t border-border/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                 <div className={cx("flex items-center gap-1.5", r.enabled && getPriorityColor(r.priority))}>
                   {r.scheduleType !== 'one-time' ? <Repeat size={12} /> : <CalendarDays size={12} />}
                   <span>{r.scheduleType !== 'one-time' ? `${r.scheduleType}` : 'Once'} · {fmtDateStr(r.remindAt)}</span>
                 </div>
                 {r.subject && <span className="uppercase tracking-widest opacity-60">Linked</span>}
               </div>
             </div>
           ))}
         </div>
       )}
       {open && <ReminderForm initial={editing} onClose={() => setOpen(false)}/>}
    </Shell>
  );
}

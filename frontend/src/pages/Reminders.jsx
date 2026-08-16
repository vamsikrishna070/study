import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Plus, Trash2, Clock } from 'lucide-react';
import { getGetRemindersQueryKey, useCreateReminder, useDeleteReminder, useGetReminders, useUpdateReminder } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, Field, LoadingBlock, Modal, PageHeading, QueryState, cx, fmtDate, inputClass } from '../components/shared.jsx';

function ReminderForm({ initial, onClose }) {
  const qc = useQueryClient();
  const create = useCreateReminder();
  const update = useUpdateReminder();
  
  const [form, setForm] = useState({
    title: initial?.title || '',
    date: initial?.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    time: initial?.time || '09:00',
    type: initial?.type || 'general'
  });
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const submit = (e) => {
    e.preventDefault();
    const done = () => {
      qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() });
      onClose();
    };
    initial 
      ? update.mutate({ id: initial.id || initial._id, data: form }, { onSuccess: done })
      : create.mutate({ data: form }, { onSuccess: done });
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
          
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date">
              <input required type="date" className={inputClass} value={form.date} onChange={e => set('date', e.target.value)} />
            </Field>
            <Field label="Time">
              <input required type="time" className={inputClass} value={form.time} onChange={e => set('time', e.target.value)} />
            </Field>
          </div>

          <Field label="Type">
            <select className={inputClass} value={form.type} onChange={e => set('type', e.target.value)}>
              <option value="general">General</option>
              <option value="exam">Exam</option>
              <option value="task">Task</option>
              <option value="review">Review</option>
            </select>
          </Field>
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

  const remove = (rem) => {
    if (confirm(`Delete "${rem.title}"?`)) {
      del.mutate({ id: rem._id || rem.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() }) });
    }
  };

  const toggleStatus = (rem) => {
    const status = rem.status === 'completed' ? 'pending' : 'completed';
    update.mutate({ id: rem._id || rem.id, data: { status } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() }) });
  };

  const pending = reminders.filter(r => r.status !== 'completed');
  const completed = reminders.filter(r => r.status === 'completed');

  return (
    <Shell>
      <PageHeading 
        eyebrow="Gentle nudges" 
        title="Reminders" 
        detail="Offload your future self's responsibilities here."
        action={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16}/> Add reminder</Button>}
      />

      {query.isLoading ? <LoadingBlock lines={5}/> : 
       query.error ? <QueryState error={query.error} onRetry={() => query.refetch()} label="Reminders"/> : 
       !reminders.length ? (
         <EmptyState 
           icon={Bell} 
           title="No active reminders" 
           detail="Set alerts for registration deadlines or weekly reviews." 
           action={<Button onClick={() => setOpen(true)}><Plus size={16} /> Set a reminder</Button>}
         />
       ) : (
         <div className="space-y-8">
           {pending.length > 0 && (
             <div>
               <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Pending</h3>
               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                 {pending.map(r => (
                   <div key={r._id || r.id} className="card-lift flex items-start gap-4 rounded-xl border border-card-border bg-card p-4">
                     <button onClick={() => toggleStatus(r)} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/35 hover:border-accent">
                       <span className="sr-only">Mark complete</span>
                     </button>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between gap-2">
                         <span className={cx("rounded px-1.5 py-0.5 font-mono text-[9px] uppercase", r.type === 'exam' ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground')}>{r.type}</span>
                         <button onClick={() => remove(r)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13}/></button>
                       </div>
                       <h4 className="mt-2 font-bold leading-tight">{r.title}</h4>
                       <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                         <Clock size={12} className="text-accent" />
                         <span>{fmtDate(r.date)} at {r.time || '12:00'}</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           {completed.length > 0 && (
             <div>
               <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4 opacity-70">Completed</h3>
               <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
                 {completed.map(r => (
                   <div key={r._id || r.id} className="flex items-start gap-4 rounded-xl border border-border bg-background p-4">
                     <button onClick={() => toggleStatus(r)} className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                       <Check size={12} />
                     </button>
                     <div className="flex-1 min-w-0">
                       <h4 className="font-bold leading-tight line-through text-muted-foreground">{r.title}</h4>
                       <p className="mt-1 text-[11px] text-muted-foreground">Done</p>
                     </div>
                     <button onClick={() => remove(r)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13}/></button>
                   </div>
                 ))}
               </div>
             </div>
           )}
         </div>
       )}
       {open && <ReminderForm initial={editing} onClose={() => setOpen(false)}/>}
    </Shell>
  );
}

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus } from 'lucide-react';
import { getGetDashboardQueryKey, getGetExamsQueryKey, useCreateExam, useGetExams, useGetSubjects } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, Field, LoadingBlock, Modal, PageHeading, QueryState, fmtFullDate, inputClass } from '../components/shared.jsx';

const today = () => new Date().toISOString().slice(0, 10);

function ExamForm({ onClose, subjects }) {
  const qc = useQueryClient();
  const create = useCreateExam();
  const [form, setForm] = useState({ name: '', subjectId: subjects[0]?.id || '', date: today(), time: '', venue: '', type: 'End semester' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const submit = (e) => {
    e.preventDefault();
    create.mutate({ data: form }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetExamsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        onClose();
      }
    });
  };

  return (
    <form id="exam-form" onSubmit={submit} className="flex h-full flex-col">
      <Modal 
        title="Add an exam" 
        eyebrow="Make the date real" 
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="exam-form" disabled={create.isPending} testId="button-save-exam">
              {create.isPending ? 'Saving…' : 'Add exam'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="Exam name">
            <input required className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Operating Systems end semester" data-testid="input-exam-name" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Subject">
              <select className={inputClass} value={form.subjectId} onChange={e => set('subjectId', e.target.value)} data-testid="select-exam-subject">
                {subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select className={inputClass} value={form.type} onChange={e => set('type', e.target.value)} data-testid="select-exam-type">
                <option>End semester</option>
                <option>Internal</option>
                <option>Practical</option>
                <option>Viva</option>
              </select>
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Date">
              <input required type="date" className={inputClass} value={form.date} onChange={e => set('date', e.target.value)} data-testid="input-exam-date" />
            </Field>
            <Field label="Time">
              <input type="time" className={inputClass} value={form.time} onChange={e => set('time', e.target.value)} data-testid="input-exam-time" />
            </Field>
            <Field label="Venue">
              <input className={inputClass} value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Room 204" data-testid="input-exam-venue" />
            </Field>
          </div>
        </div>
      </Modal>
    </form>
  );
}

export default function ExamsPage() {
  const subjects=(useGetSubjects().data||[]);const query=useGetExams();const exams=query.data;const [open,setOpen]=useState(false);
  return <Shell><PageHeading eyebrow="Dates worth respecting" title="Exams" detail="A clear countdown turns vague anxiety into a plan." action={<Button onClick={()=>setOpen(true)} testId="button-add-exam"><Plus size={16}/> Add exam</Button>}/>{query.isLoading?<LoadingBlock lines={5}/>:query.error?<QueryState error={query.error} onRetry={()=>query.refetch()} label="Exams"/>:!exams?.length?<EmptyState icon={CalendarDays} title="No exams logged" detail="Put the dates somewhere you trust. Your future self will thank you." action={<Button onClick={()=>setOpen(true)} testId="button-empty-add-exam"><Plus size={16}/> Add exam</Button>}/>:<div className="space-y-4">{exams.map(e=><article key={e.id} className="card-lift grid gap-5 rounded-2xl border border-card-border bg-card p-5 sm:grid-cols-[90px_1fr_auto] sm:items-center sm:p-6" data-testid={`exam-card-${e.id}`}><div className="rounded-xl bg-primary p-3 text-center text-primary-foreground"><div className="font-mono text-[10px] uppercase opacity-65">{new Intl.DateTimeFormat('en-IN',{month:'short'}).format(new Date(e.date))}</div><div className="font-display text-3xl">{new Date(e.date).getDate()}</div></div><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-accent/15 px-2 py-1 font-mono text-[9px] uppercase text-accent">{e.type}</span><span className="text-xs text-muted-foreground">{e.subject}</span></div><h2 className="mt-2 font-display text-2xl">{e.name}</h2><p className="mt-1 text-xs text-muted-foreground">{fmtFullDate(e.date)}{e.time&&` · ${e.time}`}{e.venue&&` · ${e.venue}`}</p></div><div className="text-left sm:text-right"><div className="font-display text-3xl text-accent">{e.daysLeft < 0 ? 'Past' : `${e.daysLeft}d`}</div><div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">to go</div><div className="mt-3 w-28 progress-track sm:ml-auto"><div className="progress-fill" style={{width:`${e.progress}%`}}/></div></div></article>)}</div>}{open&&<ExamForm subjects={subjects} onClose={()=>setOpen(false)}/>}</Shell>;
}

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus } from 'lucide-react';
import { getGetDashboardQueryKey, getGetExamsQueryKey, useCreateExam, useGetExams, useGetSubjects, useUpdateExam, useDeleteExam } from '../services/apiHooks.js';
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
            <input required className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter exam name" data-testid="input-exam-name" />
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
              <input className={inputClass} value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Add exam details" data-testid="input-exam-venue" />
            </Field>
          </div>
        </div>
      </Modal>
    </form>
  );
}

function ExamPerformanceModal({ exam, onClose }) {
  const qc = useQueryClient();
  const update = useUpdateExam();
  
  const [performance, setPerformance] = useState(exam.performance || 'Good');
  const [reflection, setReflection] = useState(exam.reflection || '');
  const [marksPending, setMarksPending] = useState(
    exam.marksObtained === undefined || exam.marksObtained === null
  );
  const [marksObtained, setMarksObtained] = useState(
    exam.marksObtained !== undefined && exam.marksObtained !== null ? exam.marksObtained : ''
  );
  const [maxMarks, setMaxMarks] = useState(
    exam.maxMarks !== undefined && exam.maxMarks !== null ? exam.maxMarks : ''
  );
  const [errorMsg, setErrorMsg] = useState('');

  // Calculate percentage dynamically
  let percentage = '';
  if (!marksPending && marksObtained !== '' && maxMarks !== '') {
    const ob = Number(marksObtained);
    const mx = Number(maxMarks);
    if (!isNaN(ob) && !isNaN(mx) && mx > 0) {
      percentage = ((ob / mx) * 100).toFixed(2) + '%';
    }
  }

  const handleSave = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const data = {
      completed: true,
      performance,
      reflection,
    };

    if (marksPending) {
      data.marksObtained = null;
      data.maxMarks = null;
      data.percentage = null;
    } else {
      if (marksObtained === '' || maxMarks === '') {
        setErrorMsg('Please enter both marks obtained and maximum marks, or select "Marks not available yet"');
        return;
      }
      const ob = Number(marksObtained);
      const mx = Number(maxMarks);

      if (isNaN(ob) || ob < 0) {
        setErrorMsg('Marks obtained cannot be negative');
        return;
      }
      if (isNaN(mx) || mx <= 0) {
        setErrorMsg('Maximum marks must be greater than 0');
        return;
      }
      if (ob > mx) {
        setErrorMsg('Marks obtained cannot be greater than maximum marks');
        return;
      }

      data.marksObtained = ob;
      data.maxMarks = mx;
    }

    update.mutate({ id: exam.id || exam._id, data }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetExamsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        onClose();
      },
      onError: (err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to save performance');
      }
    });
  };

  return (
    <Modal
      title="Record Performance"
      eyebrow={exam.name}
      onClose={onClose}
      onSubmit={handleSave}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={update.isPending} testId="button-save-performance">
            {update.isPending ? 'Saving…' : 'Save Performance'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {errorMsg && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-semibold">
            {errorMsg}
          </div>
        )}

        <Field label="How did you perform?">
          <div className="flex flex-wrap gap-2 pt-1">
            {['Excellent', 'Good', 'Average', 'Poor', 'Very Poor'].map((rating) => (
              <label
                key={rating}
                className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                  performance === rating
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'border-border bg-background hover:bg-muted text-muted-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="performance"
                  value={rating}
                  checked={performance === rating}
                  onChange={(e) => setPerformance(e.target.value)}
                  className="sr-only"
                />
                {rating}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Your reflection">
          <textarea
            className={`${inputClass} min-h-[80px] resize-none py-2`}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="What went well? What needs improvement?"
            data-testid="input-exam-reflection"
          />
        </Field>

        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={marksPending}
              onChange={(e) => setMarksPending(e.target.checked)}
              className="h-4 w-4 rounded border-input text-accent focus:ring-accent"
            />
            <span>Marks not available yet</span>
          </label>

          {!marksPending && (
            <div className="grid gap-4 sm:grid-cols-3 items-end">
              <Field label="Marks Obtained">
                <input
                  type="number"
                  step="any"
                  className={inputClass}
                  value={marksObtained}
                  onChange={(e) => setMarksObtained(e.target.value)}
                  placeholder="e.g. 78"
                  required
                  data-testid="input-marks-obtained"
                />
              </Field>
              <Field label="Maximum Marks">
                <input
                  type="number"
                  step="any"
                  className={inputClass}
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  placeholder="e.g. 100"
                  required
                  data-testid="input-max-marks"
                />
              </Field>
              <div className="min-h-[44px] flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground block mb-2">Percentage</span>
                <div className="font-mono font-bold text-sm bg-background border border-input rounded-xl px-3.5 py-2.5 h-[44px] flex items-center">
                  {percentage || '—'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function ExamsPage() {
  const subjects = useGetSubjects().data || [];
  const query = useGetExams();
  const exams = query.data;
  const [open, setOpen] = useState(false);
  const [performanceExam, setPerformanceExam] = useState(null);
  const [selectedTab, setSelectedTab] = useState('upcoming');
  
  const qc = useQueryClient();
  const del = useDeleteExam();

  const remove = (exam) => {
    if (confirm(`Delete exam "${exam.name}"?`)) {
      del.mutate({ id: exam.id || exam._id }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetExamsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        }
      });
    }
  };

  const filteredExams = (exams || []).filter(e => {
    if (selectedTab === 'completed') {
      return e.completed === true;
    }
    return e.completed === false;
  });

  return (
    <Shell>
      <PageHeading 
        eyebrow="Dates worth respecting" 
        title="Exams" 
        detail="A clear countdown turns vague anxiety into a plan." 
        action={<Button onClick={() => setOpen(true)} testId="button-add-exam"><Plus size={16}/> Add exam</Button>}
      />

      {/* Category Tabs */}
      <div className="mb-6 flex border-b border-border">
        {['upcoming', 'completed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all capitalize -mb-px ${
              selectedTab === tab
                ? 'border-accent text-accent font-bold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            data-testid={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {query.isLoading ? (
        <LoadingBlock lines={5}/>
      ) : query.error ? (
        <QueryState error={query.error} onRetry={() => query.refetch()} label="Exams"/>
      ) : !exams?.length ? (
        <EmptyState 
          icon={CalendarDays} 
          title="No exams logged" 
          detail="Put the dates somewhere you trust. Your future self will thank you." 
          action={<Button onClick={() => setOpen(true)} testId="button-empty-add-exam"><Plus size={16}/> Add exam</Button>}
        />
      ) : !filteredExams.length ? (
        <EmptyState 
          icon={CalendarDays} 
          title={`No ${selectedTab} exams`} 
          detail={`There are no exams currently categorized as ${selectedTab}.`}
        />
      ) : (
        <div className="space-y-4">
          {filteredExams.map(e => (
            <article key={e.id} className="card-lift grid gap-5 rounded-2xl border border-card-border bg-card p-5 sm:grid-cols-[90px_1fr_auto] sm:items-center sm:p-6" data-testid={`exam-card-${e.id}`}>
              <div className="rounded-xl bg-primary p-3 text-center text-primary-foreground">
                <div className="font-mono text-[10px] uppercase opacity-65">
                  {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(e.date))}
                </div>
                <div className="font-display text-3xl">{new Date(e.date).getDate()}</div>
              </div>
              
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent/15 px-2 py-1 font-mono text-[9px] uppercase text-accent">{e.type}</span>
                  <span className="text-xs text-muted-foreground">{e.subject}</span>
                  {e.completed && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                      Completed ✓
                    </span>
                  )}
                </div>
                <h2 className="mt-2 font-display text-2xl">{e.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {fmtFullDate(e.date)}{e.time && ` · ${e.time}`}{e.venue && ` · ${e.venue}`}
                </p>
                
                {e.completed && (
                  <div className="mt-3 space-y-1 rounded-xl bg-background/50 border border-border/40 p-3 text-[11px] leading-relaxed max-w-xl">
                    <div>
                      <span className="font-semibold text-muted-foreground">Performance: </span>
                      <span className="font-bold text-foreground">{e.performance || 'Good'}</span>
                    </div>
                    {e.reflection && (
                      <div>
                        <span className="font-semibold text-muted-foreground">Reflection: </span>
                        <span className="text-muted-foreground italic">"{e.reflection}"</span>
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-muted-foreground">Result: </span>
                      {e.marksObtained !== undefined && e.marksObtained !== null ? (
                        <span className="font-bold text-accent">{e.marksObtained} / {e.maxMarks} ({e.percentage}%)</span>
                      ) : (
                        <span className="font-bold text-amber-600 dark:text-amber-400">Result Pending</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-start sm:items-end justify-between h-full gap-4">
                <div className="text-left sm:text-right">
                  <div className="font-display text-3xl text-accent">
                    {e.completed ? 'Done' : e.daysLeft < 0 ? 'Past' : `${e.daysLeft}d`}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {e.completed ? 'Exam' : 'to go'}
                  </div>
                  {!e.completed && (
                    <div className="mt-3 w-28 progress-track sm:ml-auto">
                      <div className="progress-fill" style={{ width: `${e.progress}%` }}/>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {!e.completed ? (
                    <Button onClick={() => setPerformanceExam(e)} className="h-8 px-3 text-[11px]" testId={`btn-complete-${e.id}`}>
                      Mark as Completed
                    </Button>
                  ) : (
                    <>
                      {!(e.marksObtained !== undefined && e.marksObtained !== null) ? (
                        <Button onClick={() => setPerformanceExam(e)} className="h-8 px-3 text-[11px]" testId={`btn-add-marks-${e.id}`}>
                          Add Marks
                        </Button>
                      ) : (
                        <Button onClick={() => setPerformanceExam(e)} className="h-8 px-3 text-[11px]" variant="quiet" testId={`btn-edit-marks-${e.id}`}>
                          Edit Result
                        </Button>
                      )}
                    </>
                  )}
                  <Button variant="danger" onClick={() => remove(e)} className="h-8 px-3 text-[11px]" testId={`btn-delete-${e.id}`}>
                    Delete
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      
      {open && <ExamForm subjects={subjects} onClose={() => setOpen(false)}/>}
      {performanceExam && <ExamPerformanceModal exam={performanceExam} onClose={() => setPerformanceExam(null)} />}
    </Shell>
  );
}

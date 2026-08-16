import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardQueryKey, getGetSubjectsQueryKey, useCreateSubject, useUpdateSubject } from '../../services/apiHooks.js';
import { Button, Field, Modal, colors, cx, inputClass } from '../shared.jsx';

export default function SubjectModal({ initial, onClose }) {
  const qc = useQueryClient();
  const create = useCreateSubject();
  const update = useUpdateSubject();
  
  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    credits: String(initial?.credits || 4),
    faculty: initial?.faculty || '',
    semester: String(initial?.semester || 1),
    description: initial?.description || '',
    color: initial?.color || colors[0],
    examDate: initial?.examDate || ''
  });
  
  const change = (key, value) => setForm(f => ({ ...f, [key]: value }));
  
  const submit = (e) => {
    e.preventDefault();
    const data = { ...form, credits: Number(form.credits), semester: Number(form.semester) };
    const done = () => {
      qc.invalidateQueries({ queryKey: getGetSubjectsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      onClose();
    };
    initial ? update.mutate({ id: initial.id, data }, { onSuccess: done }) : create.mutate({ data }, { onSuccess: done });
  };
  
  return (
    <Modal 
      title={initial ? 'Edit Subject' : 'Add Subject'} 
      eyebrow="Organize a subject for this semester" 
      onClose={onClose}
      onSubmit={submit}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending || update.isPending} testId="button-save-subject">
            {create.isPending || update.isPending ? 'Saving…' : initial ? 'Save changes' : 'Add Subject'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Row 1: Subject Name (~70%) and Code (~30%) */}
        <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
          <Field label="Subject name">
            <input required className={inputClass} value={form.name} onChange={e => change('name', e.target.value)} placeholder="e.g. Operating Systems" data-testid="input-subject-name" />
          </Field>
          <Field label="Code">
            <input required className={inputClass} value={form.code} onChange={e => change('code', e.target.value)} placeholder="CS301" data-testid="input-subject-code" />
          </Field>
        </div>
        
        {/* Row 2: Credits, Semester, Exam Date */}
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Credits">
            <input required min="1" max="10" type="number" className={inputClass} value={form.credits} onChange={e => change('credits', e.target.value)} data-testid="input-subject-credits" />
          </Field>
          <Field label="Semester">
            <select className={inputClass} value={form.semester} onChange={e => change('semester', e.target.value)} data-testid="input-subject-semester">
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
              ))}
            </select>
          </Field>
          <Field label="Exam date">
            <input type="date" className={inputClass} value={form.examDate} onChange={e => change('examDate', e.target.value)} data-testid="input-subject-exam-date" />
          </Field>
        </div>

        {/* Row 3: Faculty */}
        <Field label="Faculty">
          <input className={inputClass} value={form.faculty} onChange={e => change('faculty', e.target.value)} placeholder="Department or faculty" data-testid="input-subject-faculty" />
        </Field>
        
        {/* Row 4: Description */}
        <Field label="Description">
          <textarea className={cx(inputClass, 'min-h-24 resize-y')} value={form.description} onChange={e => change('description', e.target.value)} placeholder="What is this subject really about?" data-testid="input-subject-description" />
        </Field>
        
        {/* Row 5: Accent Color */}
        <Field label="Accent color">
          <div className="flex flex-wrap gap-3">
            {colors.map(color => (
              <button type="button" key={color} onClick={() => change('color', color)} className={cx('h-8 w-8 rounded-full border-2 transition-all', form.color === color ? 'border-primary ring-2 ring-accent/30 scale-110' : 'border-transparent hover:scale-105')} style={{ backgroundColor: color }} data-testid={`button-color-${color.slice(1)}`} />
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

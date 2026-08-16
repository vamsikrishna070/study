import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud } from 'lucide-react';
import { getGetDashboardQueryKey, getGetSubjectsQueryKey, useCreateSubject, useUpdateSubject, uploadFile } from '../../services/apiHooks.js';
import { Button, Field, Modal, colors, cx, inputClass } from '../shared.jsx';
import AttachmentCard from '../shared/AttachmentCard.jsx';

export default function SubjectModal({ initial, onClose }) {
  const qc = useQueryClient();
  const create = useCreateSubject();
  const update = useUpdateSubject();
  const fileInputRef = useRef(null);
  
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

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileData, setFileData] = useState(initial?.syllabusFile || null);
  
  const change = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const processFile = async (file) => {
    setUploading(true);
    try {
      const data = await uploadFile(file);
      setFileData({
        ...data,
        mimeType: file.type,
        size: file.size,
        originalName: data.originalName || file.name,
      });
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };
  
  const submit = (e) => {
    e.preventDefault();
    const data = { 
      ...form, 
      credits: Number(form.credits), 
      semester: Number(form.semester),
      syllabusFile: fileData || undefined
    };
    const done = () => {
      qc.invalidateQueries({ queryKey: getGetSubjectsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      onClose();
    };
    initial ? update.mutate({ id: initial.id, data }, { onSuccess: done }) : create.mutate({ data }, { onSuccess: done });
  };
  
  const canSubmit = !create.isPending && !update.isPending && !uploading && form.name && form.code;

  return (
    <Modal 
      title={initial ? 'Edit Subject' : 'Add Subject'} 
      eyebrow="Organize a subject for this semester" 
      onClose={onClose}
      onSubmit={submit}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!canSubmit} testId="button-save-subject">
            {create.isPending || update.isPending ? 'Saving…' : initial ? 'Save changes' : 'Add Subject'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
          <Field label="Subject name">
            <input required className={inputClass} value={form.name} onChange={e => change('name', e.target.value)} placeholder="e.g. Operating Systems" data-testid="input-subject-name" />
          </Field>
          <Field label="Code">
            <input required className={inputClass} value={form.code} onChange={e => change('code', e.target.value)} placeholder="CS301" data-testid="input-subject-code" />
          </Field>
        </div>
        
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

        <Field label="Faculty">
          <input className={inputClass} value={form.faculty} onChange={e => change('faculty', e.target.value)} placeholder="Department or faculty" data-testid="input-subject-faculty" />
        </Field>

        <Field label="Syllabus (Optional)">
          {fileData ? (
            <AttachmentCard
              attachment={{
                type: 'file',
                originalName: fileData.originalName,
                mimeType: fileData.mimeType,
                size: fileData.size,
                url: fileData.url,
              }}
              onRemove={() => setFileData(null)}
            />
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cx(
                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
                dragOver ? 'border-accent bg-accent/5' : 'border-border bg-muted/20 hover:border-accent/50 hover:bg-muted/40',
                uploading && 'pointer-events-none opacity-50'
              )}
            >
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <p className="text-xs font-semibold text-accent">Uploading…</p>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <UploadCloud size={18} />
                  </div>
                  <p className="text-sm font-semibold">Upload Syllabus PDF</p>
                  <p className="mt-1 text-xs text-muted-foreground">Skip this to add it later</p>
                </>
              )}
            </div>
          )}
        </Field>
        
        <Field label="Description">
          <textarea className={cx(inputClass, 'min-h-24 resize-y')} value={form.description} onChange={e => change('description', e.target.value)} placeholder="What is this subject really about?" data-testid="input-subject-description" />
        </Field>
        
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

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Mic } from 'lucide-react';
import { getGetNotesQueryKey, getGetDashboardQueryKey, useCreateNote, useUpdateNote, useGetSubjects, uploadFile } from '../../services/apiHooks.js';
import { Button, Field, Modal, cx, inputClass } from '../shared.jsx';
import VoiceRecorder from '../shared/VoiceRecorder.jsx';
import AttachmentCard from '../shared/AttachmentCard.jsx';

export default function NoteModal({ initial, onClose }) {
  const qc = useQueryClient();
  const create = useCreateNote();
  const update = useUpdateNote();
  const subjectsQuery = useGetSubjects();
  const subjects = subjectsQuery.data || [];
  const fileInputRef = useRef(null);
  
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [recordingMode, setRecordingMode] = useState(false);

  const [form, setForm] = useState({
    title: initial?.title || '',
    content: initial?.content || '',
    subjectId: initial?.subjectId || '',
    topic: initial?.topic || '',
    tags: initial?.tags?.join(', ') || '',
    priority: initial?.priority || 'medium',
  });
  const [attachments, setAttachments] = useState(initial?.attachments || []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const processFile = async (file) => {
    setUploading(true);
    try {
      const data = await uploadFile(file);
      setAttachments(prev => [...prev, {
        type: 'file',
        url: data.url,
        publicId: data.publicId,
        originalName: data.originalName || file.name,
        mimeType: file.type,
        size: file.size,
      }]);
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRecordingSave = async ({ file, title, duration, type }) => {
    setRecordingMode(false);
    setUploading(true);
    try {
      const data = await uploadFile(file);
      setAttachments(prev => [...prev, {
        type,
        url: data.url,
        publicId: data.publicId,
        originalName: title,
        mimeType: file.type,
        size: file.size,
        duration
      }]);
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(processFile);
  };

  const addYouTube = () => {
    if (!youtubeUrl.trim()) return;
    setAttachments(prev => [...prev, {
      type: 'youtube',
      url: youtubeUrl.trim(),
      publicId: '',
      originalName: 'YouTube Video',
      mimeType: 'video/youtube',
      size: 0,
    }]);
    setYoutubeUrl('');
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      attachments,
    };
    const done = () => {
      qc.invalidateQueries({ queryKey: getGetNotesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      onClose();
    };
    initial
      ? update.mutate({ id: initial.id, data }, { onSuccess: done })
      : create.mutate({ data }, { onSuccess: done });
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <Modal
      title={initial ? 'Edit Note' : 'Add Note'}
      eyebrow="Capture something worth remembering"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSaving || uploading} testId="button-save-note">
            {isSaving ? 'Saving…' : initial ? 'Save changes' : 'Save Note'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Title">
          <input required className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} placeholder="The idea you want to remember" data-testid="input-note-title" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Subject">
            <select required className={inputClass} value={form.subjectId} onChange={e => set('subjectId', e.target.value)} data-testid="select-note-subject">
              <option value="">Select a subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Unit / Topic">
            <input className={inputClass} value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="e.g. Process scheduling" data-testid="input-note-topic" />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Priority">
            <select className={inputClass} value={form.priority} onChange={e => set('priority', e.target.value)} data-testid="select-note-priority">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="exam">Exam essential</option>
            </select>
          </Field>
          <Field label="Tags" hint="Comma separated">
            <input className={inputClass} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="revision, formula, key concept" data-testid="input-note-tags" />
          </Field>
        </div>

        <Field label="Note content">
          <textarea
            required
            className={cx(inputClass, 'min-h-[160px] resize-y font-mono text-sm leading-relaxed')}
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Write your notes here…&#10;&#10;Tip: Use plain text or markdown-style formatting.&#10;- Bullet points&#10;**Bold** or *italic* hints"
            data-testid="textarea-note-content"
          />
        </Field>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Attachments</span>
            <div className="flex gap-2">
              <Button type="button" variant="quiet" onClick={() => fileInputRef.current?.click()} className="h-8 gap-1.5 px-3 py-0 text-xs">
                <UploadCloud size={14} /> Upload File
              </Button>
              <Button type="button" variant="quiet" onClick={() => setRecordingMode(true)} className="h-8 gap-1.5 px-3 py-0 text-xs">
                <Mic size={14} /> Record Voice
              </Button>
            </div>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} multiple />
          </div>

          {recordingMode && (
            <VoiceRecorder onSave={handleRecordingSave} onCancel={() => setRecordingMode(false)} />
          )}

          {uploading && !recordingMode && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/10 p-4">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="text-sm font-semibold text-accent">Uploading…</span>
            </div>
          )}

          {dragOver && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-accent/5 text-center transition-colors"
            >
              <UploadCloud size={24} className="text-accent" />
              <span className="font-semibold text-accent">Drop files here</span>
            </div>
          )}

          {!dragOver && attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              {attachments.map((att, i) => (
                <AttachmentCard key={i} attachment={att} onRemove={() => removeAttachment(i)} />
              ))}
            </div>
          )}

          <div 
            className="hidden h-1" 
            onDragOver={e => { e.preventDefault(); setDragOver(true); }} 
          />

          <div className="flex gap-2 pt-2">
            <input
              className={cx(inputClass, 'flex-1 text-sm')}
              value={youtubeUrl}
              onChange={e => setYoutubeUrl(e.target.value)}
              placeholder="Paste a YouTube URL to attach…"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addYouTube(); } }}
            />
            <Button type="button" variant="quiet" onClick={addYouTube} disabled={!youtubeUrl.trim()}>
              Add
            </Button>
          </div>
          
          <div className="text-center text-[10px] text-muted-foreground">
            Supported types: PDF • PPT • DOC • Images • Audio • Video • Voice Recordings
          </div>
        </div>
      </div>
    </Modal>
  );
}

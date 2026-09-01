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
  const [customSubjectError, setCustomSubjectError] = useState('');

  const isCustomInitial = Boolean(initial?.customSubject || (initial && !initial.subjectId));

  const [form, setForm] = useState({
    title: initial?.title || '',
    content: initial?.content || '',
    subjectId: isCustomInitial ? 'other' : (initial?.subjectId || (subjects.length > 0 ? (subjects[0].id || subjects[0]._id) : 'other')),
    customSubject: initial?.customSubject || (isCustomInitial && typeof initial?.subject === 'string' && initial.subject !== 'Unassigned' ? initial.subject : ''),
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
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type.includes('pdf') ? 'document' : 'file',
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
        type: 'recording',
        url: data.url,
        publicId: data.publicId,
        originalName: title || 'Voice Note',
        mimeType: file.type || 'audio/webm',
        size: file.size,
        duration,
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
      originalName: 'YouTube Resource',
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
    if (!form.title.trim()) {
      alert('Please enter a note title.');
      return;
    }

    const isOther = form.subjectId === 'other';
    const trimmedCustom = form.customSubject.trim();

    if (isOther && !trimmedCustom) {
      setCustomSubjectError('Please enter a subject name.');
      return;
    }

    const data = {
      title: form.title.trim(),
      content: form.content.trim(),
      subjectId: isOther ? undefined : form.subjectId,
      customSubject: isOther ? trimmedCustom : '',
      topic: form.topic.trim(),
      priority: form.priority,
      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      attachments,
    };

    const done = () => {
      qc.invalidateQueries({ queryKey: getGetNotesQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      onClose();
    };

    initial
      ? update.mutate({ id: initial.id || initial._id, data }, { onSuccess: done })
      : create.mutate({ data }, { onSuccess: done });
  };

  const isSaving = create.isPending || update.isPending;
  const isOtherSelected = form.subjectId === 'other';

  return (
    <Modal
      title={initial ? 'Edit Note' : 'Add Note'}
      eyebrow="Capture something worth remembering"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            disabled={isSaving || uploading || !form.title.trim() || (isOtherSelected && !form.customSubject.trim())}
            testId="button-save-note"
          >
            {isSaving ? 'Saving…' : initial ? 'Save changes' : 'Save Note'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="Title *">
          <input
            required
            className={inputClass}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Enter note title"
            data-testid="input-note-title"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Subject *">
            <select
              required
              className={inputClass}
              value={form.subjectId}
              onChange={e => {
                const val = e.target.value;
                set('subjectId', val);
                if (val !== 'other') {
                  set('customSubject', '');
                  setCustomSubjectError('');
                }
              }}
              data-testid="select-note-subject"
            >
              <option value="">Select a subject</option>
              {subjects.map(s => (
                <option key={s.id || s._id} value={s.id || s._id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
              <option value="other">Other</option>
            </select>
          </Field>

          <Field label="Priority">
            <select
              className={inputClass}
              value={form.priority}
              onChange={e => set('priority', e.target.value)}
              data-testid="select-note-priority"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="exam">Exam essential</option>
            </select>
          </Field>
        </div>

        {isOtherSelected && (
          <Field label="Custom Subject *" hint="Enter the name of your subject or study category">
            <input
              required
              className={cx(inputClass, customSubjectError && 'border-destructive focus:border-destructive')}
              value={form.customSubject}
              onChange={e => {
                set('customSubject', e.target.value);
                if (e.target.value.trim()) setCustomSubjectError('');
              }}
              placeholder="Enter subject name (e.g. Operating Systems, Personal Study)"
              data-testid="input-note-custom-subject"
              autoFocus
            />
            {customSubjectError && (
              <p className="mt-1 text-xs text-destructive">{customSubjectError}</p>
            )}
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Topic / Unit (optional)">
            <input
              className={inputClass}
              value={form.topic}
              onChange={e => set('topic', e.target.value)}
              placeholder="Enter topic name"
              data-testid="input-note-topic"
            />
          </Field>

          <Field label="Tags (optional)" hint="Comma separated">
            <input
              className={inputClass}
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="Add tags (e.g. formulas, midterm, review)"
              data-testid="input-note-tags"
            />
          </Field>
        </div>

        <Field label="Content (optional)">
          <textarea
            className={cx(inputClass, 'min-h-[160px] resize-y font-mono text-sm leading-relaxed')}
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Write your notes here (optional)..."
            data-testid="textarea-note-content"
          />
        </Field>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">
              Attachments & Media
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="quiet"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 gap-1.5 px-3 py-0 text-xs"
              >
                <UploadCloud size={14} /> Upload File
              </Button>
              <Button
                type="button"
                variant="quiet"
                onClick={() => setRecordingMode(true)}
                className="h-8 gap-1.5 px-3 py-0 text-xs"
              >
                <Mic size={14} /> Record Voice Note
              </Button>
            </div>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="application/pdf,image/*,audio/*,video/*,.ppt,.pptx,.doc,.docx"
            />
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
              placeholder="Paste resource link (e.g. YouTube, article URL)"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addYouTube(); } }}
            />
            <Button type="button" variant="quiet" onClick={addYouTube} disabled={!youtubeUrl.trim()}>
              Add Link
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

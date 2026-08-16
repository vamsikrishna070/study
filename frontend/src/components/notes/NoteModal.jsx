import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, X, FileText, Image as ImageIcon, Video, Music, File, ExternalLink, Youtube } from 'lucide-react';
import { getGetNotesQueryKey, getGetDashboardQueryKey, useCreateNote, useUpdateNote, useGetSubjects, uploadFile } from '../../services/apiHooks.js';
import { Button, Field, Modal, cx, inputClass } from '../shared.jsx';

function AttachmentIcon({ mimeType }) {
  if (mimeType?.startsWith('image/')) return <ImageIcon size={16} />;
  if (mimeType?.startsWith('video/')) return <Video size={16} />;
  if (mimeType?.startsWith('audio/')) return <Music size={16} />;
  if (mimeType === 'application/pdf') return <FileText size={16} />;
  if (mimeType?.includes('youtube')) return <Youtube size={16} />;
  return <File size={16} />;
}

function AttachmentPreview({ attachment, onRemove }) {
  const isImage = attachment.mimeType?.startsWith('image/');
  const isAudio = attachment.mimeType?.startsWith('audio/');
  const isVideo = attachment.mimeType?.startsWith('video/');
  const isYouTube = attachment.mimeType === 'video/youtube';
  const size = attachment.size ? `${Math.round(attachment.size / 1024)} KB` : '';

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/20">
      {isImage && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img src={attachment.url} alt={attachment.originalName} className="h-full w-full object-cover" />
        </div>
      )}
      {isAudio && (
        <div className="p-3">
          <audio controls src={attachment.url} className="w-full" />
        </div>
      )}
      {isVideo && (
        <div className="aspect-video w-full overflow-hidden bg-black">
          <video controls src={attachment.url} className="h-full w-full" />
        </div>
      )}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
          <AttachmentIcon mimeType={attachment.mimeType} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{attachment.originalName}</p>
          {size && <p className="text-[10px] text-muted-foreground">{size}</p>}
        </div>
        <div className="flex items-center gap-1">
          {!isAudio && !isVideo && attachment.url && (
            <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              <ExternalLink size={13} />
            </a>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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
        {/* Row 1: Title */}
        <Field label="Title">
          <input required className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} placeholder="The idea you want to remember" data-testid="input-note-title" />
        </Field>

        {/* Row 2: Subject + Topic */}
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

        {/* Row 3: Priority + Tags */}
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

        {/* Note content */}
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

        {/* Attachments */}
        <div className="space-y-3">
          <span className="block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Attachments</span>

          {/* Existing attachments */}
          {attachments.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {attachments.map((att, i) => (
                <AttachmentPreview key={i} attachment={att} onRemove={() => removeAttachment(i)} />
              ))}
            </div>
          )}

          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cx(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors',
              dragOver ? 'border-accent bg-accent/5' : 'border-border bg-muted/10 hover:border-accent/50 hover:bg-muted/30',
              uploading && 'pointer-events-none opacity-50'
            )}
          >
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} multiple />
            {uploading ? (
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <span className="text-sm font-semibold text-accent">Uploading…</span>
              </div>
            ) : (
              <>
                <UploadCloud size={20} className="text-muted-foreground" />
                <span className="text-sm font-semibold">+ Add attachment</span>
                <span className="text-xs text-muted-foreground">PDF • PPT • DOC • Image • Audio • Video</span>
              </>
            )}
          </div>

          {/* YouTube URL */}
          <div className="flex gap-2">
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
        </div>
      </div>
    </Modal>
  );
}

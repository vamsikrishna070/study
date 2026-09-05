import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, Plus } from 'lucide-react';
import { getGetResourcesQueryKey, useCreateResource, useGetSubjects, uploadFile } from '../../services/apiHooks.js';
import { Button, Field, Modal, cx, inputClass } from '../shared.jsx';
import VoiceRecorder from '../shared/VoiceRecorder.jsx';
import AttachmentCard from '../shared/AttachmentCard.jsx';

const RESOURCE_TYPES = [
  { value: 'file', label: 'PDF / Document / File' },
  { value: 'link', label: 'Web Link' },
  { value: 'youtube', label: 'YouTube Video' },
  { value: 'recording', label: 'Voice Recording' },
];

export default function ResourceModal({ onClose }) {
  const qc = useQueryClient();
  const create = useCreateResource();
  const subjectsQuery = useGetSubjects();
  const subjects = subjectsQuery.data || [];
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({
    title: '',
    url: '',
    resourceType: 'file',
    subjectId: '',
    topic: '',
    description: '',
    rating: '0',
    watched: 'false',
    tags: ''
  });
  const [attachments, setAttachments] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isLinkType = form.resourceType === 'link' || form.resourceType === 'youtube';
  const isFileType = form.resourceType === 'file';
  const isRecordingType = form.resourceType === 'recording';

  const processFiles = async (files) => {
    if (!files || files.length === 0) return;

    // Prevent accidental duplicate selection
    const existingKeys = new Set(attachments.map(a => `${a.originalName || a.name}_${a.size}`));
    const uniqueFiles = files.filter(f => !existingKeys.has(`${f.name}_${f.size}`));

    if (uniqueFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = uniqueFiles.map(async (file) => {
        try {
          const data = await uploadFile(file);
          return {
            publicId: data.publicId,
            url: data.url,
            originalName: data.originalName || file.name,
            name: data.originalName || file.name,
            mimeType: data.mimeType || file.type,
            size: file.size,
            type: file.type.startsWith('image/')
              ? 'image'
              : file.type.startsWith('audio/')
              ? 'audio'
              : 'file',
          };
        } catch (err) {
          console.error('Upload failed for', file.name, err);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const successful = results.filter(Boolean);

      if (successful.length > 0) {
        setAttachments(prev => [...prev, ...successful]);
        if (!form.title && uniqueFiles[0]) {
          set('title', uniqueFiles[0].name.replace(/\.[^.]+$/, ''));
        }
      }

      if (successful.length < uniqueFiles.length) {
        alert(`${uniqueFiles.length - successful.length} file(s) failed to upload. Please try again.`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleRecordingSave = async ({ file, title, duration }) => {
    setUploading(true);
    try {
      const data = await uploadFile(file);
      const newAtt = {
        publicId: data.publicId,
        url: data.url,
        originalName: title || 'Voice Recording',
        name: title || 'Voice Recording',
        mimeType: file.type || 'audio/webm',
        size: file.size,
        type: 'recording',
        duration,
      };
      setAttachments(prev => [...prev, newAtt]);
      if (!form.title) set('title', title || 'Voice Recording');
    } catch {
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = (e) => {
    e.preventDefault();
    const finalAttachments = attachments;
    const data = {
      title: form.title.trim(),
      url: isLinkType ? form.url.trim() : (finalAttachments[0]?.url || form.url.trim() || ''),
      resourceType: form.resourceType,
      subjectId: form.subjectId || undefined,
      topic: form.topic.trim(),
      description: form.description.trim(),
      rating: Number(form.rating),
      watched: form.watched === 'true',
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      attachments: finalAttachments,
      fileData: finalAttachments[0] ? {
        publicId: finalAttachments[0].publicId,
        url: finalAttachments[0].url,
        originalName: finalAttachments[0].originalName || finalAttachments[0].name,
        mimeType: finalAttachments[0].mimeType,
        size: finalAttachments[0].size,
        duration: finalAttachments[0].duration,
      } : undefined,
    };

    create.mutate({ data }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetResourcesQueryKey() });
        onClose();
      },
    });
  };

  const canSubmit = !create.isPending && !uploading && form.title.trim() && (
    isLinkType ? form.url.trim() : attachments.length > 0
  );

  const urlLabel = form.resourceType === 'youtube' ? 'YouTube URL *' : 'URL *';
  const urlPlaceholder = form.resourceType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://';

  return (
    <Modal
      title="Save a Resource"
      eyebrow="Curate your study collection"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!canSubmit}>
            {create.isPending ? 'Saving…' : 'Save resource'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Resource type">
            <select
              className={inputClass}
              value={form.resourceType}
              onChange={e => {
                set('resourceType', e.target.value);
                setAttachments([]);
                set('url', '');
              }}
            >
              {RESOURCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Title *">
            <input
              required
              className={inputClass}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Enter resource title"
            />
          </Field>
        </div>

        {isLinkType && (
          <Field label={urlLabel}>
            <input
              required
              type="url"
              className={inputClass}
              value={form.url}
              onChange={e => set('url', e.target.value)}
              placeholder={urlPlaceholder}
            />
          </Field>
        )}

        {isFileType && (
          <Field label={`Attachments ${attachments.length > 0 ? `(${attachments.length}) *` : '*'}`}>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="application/pdf,image/*,audio/*,video/*,.ppt,.pptx,.doc,.docx,.txt"
            />

            {attachments.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {attachments.map((att, idx) => (
                    <AttachmentCard
                      key={att.publicId || `${att.name}_${idx}`}
                      attachment={att}
                      onRemove={() => removeAttachment(idx)}
                    />
                  ))}
                </div>

                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cx(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 px-4 text-center transition-colors',
                    dragOver ? 'border-accent bg-accent/5' : 'border-border bg-muted/20 hover:border-accent/50 hover:bg-muted/40',
                    uploading && 'pointer-events-none opacity-50'
                  )}
                >
                  {uploading ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      <span>Uploading files…</span>
                    </div>
                  ) : (
                    <>
                      <Plus size={15} className="text-accent" />
                      <span className="text-xs font-semibold text-foreground">Add more files (drop or browse)</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cx(
                  'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                  dragOver ? 'border-accent bg-accent/5' : 'border-border bg-muted/20 hover:border-accent/50 hover:bg-muted/40',
                  uploading && 'pointer-events-none opacity-50'
                )}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="text-sm font-semibold text-accent">Uploading files…</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                      <UploadCloud size={22} />
                    </div>
                    <p className="text-sm font-semibold">Drag & drop or browse files</p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF • PPT • DOC • Images • Audio • Video (Select multiple)</p>
                  </>
                )}
              </div>
            )}
          </Field>
        )}

        {isRecordingType && (
          <Field label="Voice Recording *">
            {attachments.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {attachments.map((att, idx) => (
                  <AttachmentCard
                    key={att.publicId || idx}
                    attachment={att}
                    onRemove={() => removeAttachment(idx)}
                  />
                ))}
              </div>
            ) : uploading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/10 p-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                <span className="text-sm font-semibold text-accent">Uploading recording…</span>
              </div>
            ) : (
              <VoiceRecorder onSave={handleRecordingSave} onCancel={() => set('resourceType', 'file')} />
            )}
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Subject (optional)">
            <select className={inputClass} value={form.subjectId} onChange={e => set('subjectId', e.target.value)}>
              <option value="">No specific subject (General)</option>
              {subjects.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Topic (optional)">
            <input className={inputClass} value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="Enter topic name" />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Rating">
            <select className={inputClass} value={form.rating} onChange={e => set('rating', e.target.value)}>
              <option value="0">Not rated</option>
              <option value="5">⭐⭐⭐⭐⭐ Essential</option>
              <option value="4">⭐⭐⭐⭐ Very useful</option>
              <option value="3">⭐⭐⭐ Useful</option>
              <option value="2">⭐⭐ Okay</option>
              <option value="1">⭐ Not great</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.watched} onChange={e => set('watched', e.target.value)}>
              <option value="false">To explore</option>
              <option value="true">Completed</option>
            </select>
          </Field>
        </div>

        <Field label="Tags (optional)" hint="Separate with commas">
          <input className={inputClass} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Add tags" />
        </Field>

        <Field label="Description (optional)">
          <textarea className={cx(inputClass, 'min-h-[88px] resize-y')} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add resource description" />
        </Field>
      </div>
    </Modal>
  );
}

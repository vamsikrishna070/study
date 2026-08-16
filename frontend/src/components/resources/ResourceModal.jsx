import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { UploadCloud, FileText, Image as ImageIcon, Video, Music, File, X, ExternalLink, Youtube } from 'lucide-react';
import { getGetResourcesQueryKey, useCreateResource, useGetSubjects, uploadFile } from '../../services/apiHooks.js';
import { Button, Field, Modal, cx, inputClass } from '../shared.jsx';

const RESOURCE_TYPES = [
  { value: 'Link', label: 'Web Link' },
  { value: 'YouTube', label: 'YouTube Video' },
  { value: 'Document', label: 'PDF / Document' },
  { value: 'Presentation', label: 'Presentation' },
  { value: 'Image', label: 'Image' },
  { value: 'Audio', label: 'Audio' },
  { value: 'Video', label: 'Video' },
  { value: 'Other', label: 'Other File' },
];

const FILE_TYPES = ['Document', 'Presentation', 'Image', 'Audio', 'Video', 'Other'];
const LINK_TYPES = ['Link', 'YouTube'];

function FileIcon({ mimeType, type }) {
  if (mimeType?.startsWith('image/') || type === 'Image') return <ImageIcon size={24} />;
  if (mimeType?.startsWith('video/') || type === 'Video') return <Video size={24} />;
  if (mimeType?.startsWith('audio/') || type === 'Audio') return <Music size={24} />;
  if (type === 'YouTube') return <Youtube size={24} />;
  if (mimeType === 'application/pdf' || type === 'Document') return <FileText size={24} />;
  return <File size={24} />;
}

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
    resourceType: 'Link',
    subjectId: '',
    topic: '',
    description: '',
    rating: '0',
    watched: 'false',
    tags: ''
  });
  const [fileData, setFileData] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const isFileType = FILE_TYPES.includes(form.resourceType);
  const isLinkType = LINK_TYPES.includes(form.resourceType);

  const processFile = async (file) => {
    setUploading(true);
    try {
      const data = await uploadFile(file);
      setFileData(data);
      if (!form.title) set('title', file.name.replace(/\.[^.]+$/, ''));
      if (file.type.startsWith('image/')) set('resourceType', 'Image');
      else if (file.type.startsWith('video/')) set('resourceType', 'Video');
      else if (file.type.startsWith('audio/')) set('resourceType', 'Audio');
      else if (file.type === 'application/pdf') set('resourceType', 'Document');
      else if (file.type.includes('presentation') || file.type.includes('powerpoint')) set('resourceType', 'Presentation');
      else set('resourceType', 'Other');
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
      rating: Number(form.rating),
      watched: form.watched === 'true',
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      fileData: fileData || undefined,
    };
    create.mutate({ data }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetResourcesQueryKey() });
        onClose();
      },
    });
  };

  const urlLabel = form.resourceType === 'YouTube' ? 'YouTube URL' : 'URL';
  const urlPlaceholder = form.resourceType === 'YouTube' ? 'https://youtube.com/watch?v=...' : 'https://';
  const canSubmit = !create.isPending && !uploading && (isLinkType ? form.url : fileData);

  return (
    <Modal
      title="Save a Resource"
      eyebrow="Curate your edge"
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
        {/* Row 1: Resource Type + Title */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Resource type">
            <select
              className={inputClass}
              value={form.resourceType}
              onChange={e => {
                set('resourceType', e.target.value);
                setFileData(null);
                set('url', '');
              }}
            >
              {RESOURCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Title">
            <input required className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Name of this resource" />
          </Field>
        </div>

        {/* Row 2: URL (for Link/YouTube) OR File Uploader (for files) */}
        {isLinkType ? (
          <Field label={urlLabel}>
            <input required type="url" className={inputClass} value={form.url} onChange={e => set('url', e.target.value)} placeholder={urlPlaceholder} />
          </Field>
        ) : (
          <Field label="File">
            {fileData ? (
              <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileIcon mimeType={fileData.mimeType} type={form.resourceType} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{fileData.originalName}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(fileData.size / 1024)} KB</p>
                </div>
                <button type="button" onClick={() => setFileData(null)} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cx(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
                  dragOver ? 'border-accent bg-accent/5' : 'border-border bg-muted/20 hover:border-accent/50 hover:bg-muted/40',
                  uploading && 'pointer-events-none opacity-50'
                )}
              >
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="text-sm font-semibold text-accent">Uploading…</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
                      <UploadCloud size={22} />
                    </div>
                    <p className="text-sm font-semibold">Drag & drop or browse files</p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF • PPT • PPTX • DOC • DOCX • Images • Audio • Video</p>
                  </>
                )}
              </div>
            )}
          </Field>
        )}

        {/* Row 3: Subject + Topic */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Subject">
            <select className={inputClass} value={form.subjectId} onChange={e => set('subjectId', e.target.value)}>
              <option value="">No specific subject</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Topic">
            <input className={inputClass} value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="Optional topic" />
          </Field>
        </div>

        {/* Row 4: Rating + Status */}
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

        {/* Row 5: Tags */}
        <Field label="Tags" hint="Separate with commas">
          <input className={inputClass} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. video, tutorial, advanced" />
        </Field>

        {/* Row 6: Description */}
        <Field label="Description">
          <textarea className={cx(inputClass, 'min-h-[88px] resize-y')} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Why is this worth your time?" />
        </Field>
      </div>
    </Modal>
  );
}

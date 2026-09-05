import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Library, Plus, FileText, Image as ImageIcon, Video, Music, File, ExternalLink, Download, Share2, Trash2, Check, X } from 'lucide-react';
import { getGetResourcesQueryKey, useGetResources, useDeleteResource, useUpdateResource } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, LoadingBlock, PageHeading, QueryState, cx, fmtDate } from '../components/shared.jsx';
import ResourceModal from '../components/resources/ResourceModal.jsx';

function ResourceIcon({ type, mimeType }) {
  if (mimeType?.includes('image')) return <ImageIcon size={17} className="text-blue-500" />;
  if (mimeType?.includes('video')) return <Video size={17} className="text-purple-500" />;
  if (mimeType?.includes('audio')) return <Music size={17} className="text-primary" />;
  if (type === 'Document' || mimeType?.includes('pdf')) return <FileText size={17} className="text-orange-500" />;
  if (type === 'Presentation') return <File size={17} className="text-amber-500" />;
  return <ExternalLink size={17} className="text-muted-foreground" />;
}

export default function ResourcesPage() {
  const qc = useQueryClient();
  const query = useGetResources();
  const resources = query.data;
  const del = useDeleteResource();
  const update = useUpdateResource();

  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const remove = (r) => {
    if (confirm(`Delete "${r.title}"?`)) {
      del.mutate({ id: r.id || r._id }, {
        onSuccess: () => qc.invalidateQueries({ queryKey: getGetResourcesQueryKey() })
      });
    }
  };

  const handleShare = async (url, id) => {
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'StudyArena Resource', url });
        return;
      } catch {

      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {

    }
  };

  const handleDownload = async (url, filename) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'resource';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <Shell>
      <PageHeading
        eyebrow="A considered library"
        title="Resources"
        detail="Keep the best explanations close, not scattered across twenty tabs."
        action={
          <Button onClick={() => setOpen(true)} testId="button-add-resource">
            <Plus size={16} /> Save resource
          </Button>
        }
      />

      {query.isLoading ? (
        <LoadingBlock lines={5} />
      ) : query.error ? (
        <QueryState error={query.error} onRetry={() => query.refetch()} label="Resources" />
      ) : !resources?.length ? (
        <EmptyState
          icon={Library}
          title="Your library is empty"
          detail="Save videos, articles, docs, and problem sets as you find them."
          action={
            <Button onClick={() => setOpen(true)} testId="button-empty-add-resource">
              <Plus size={16} /> Save first resource
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((r) => {
            const resId = r.id || r._id;
            const subjectLabel = r.customSubject || r.subject?.name || r.subject || 'General';
            const attList = (r.attachments && r.attachments.length > 0)
              ? r.attachments
              : (r.fileData?.url || r.url)
              ? [{
                  id: r.fileData?.publicId || 'legacy',
                  name: r.fileData?.originalName || r.title,
                  url: r.fileData?.url || r.url,
                  mimeType: r.fileData?.mimeType || 'application/pdf',
                  type: r.resourceType || 'file',
                  size: r.fileData?.size || 0
                }]
              : [];

            const handleRemoveAttachment = (attIdx) => {
              const updatedAtts = attList.filter((_, idx) => idx !== attIdx);
              update.mutate({
                id: resId,
                data: { attachments: updatedAtts }
              }, {
                onSuccess: () => qc.invalidateQueries({ queryKey: getGetResourcesQueryKey() }),
                onError: () => alert('Failed to remove attachment')
              });
            };

            return (
              <article key={resId} className="card-lift flex flex-col rounded-2xl border border-card-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <ResourceIcon type={r.resourceType} mimeType={r.fileData?.mimeType} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cx('rounded-full px-2 py-0.5 font-mono text-[9px] uppercase', r.watched ? 'bg-accent/15 text-accent font-semibold' : 'bg-muted text-muted-foreground')}>
                      {r.watched ? 'completed' : 'to explore'}
                    </span>
                    <button
                      onClick={() => remove(r)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Delete full resource"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h2 className="mt-4 font-display text-xl leading-tight">{r.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-6 text-sm leading-5 text-muted-foreground">{r.description || 'No description added.'}</p>

                {attList.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Attachments ({attList.length})</span>
                    <div className="space-y-1.5">
                      {attList.map((att, attIdx) => {
                        const isPdf = att.mimeType?.includes('pdf') || att.name?.endsWith('.pdf');
                        const isImg = att.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(att.url);
                        const isAudio = att.mimeType?.startsWith('audio/') || att.type === 'recording' || /\.(mp3|wav|m4a|aac|ogg)$/i.test(att.url);

                        return (
                          <div key={att.id || attIdx} className="flex flex-col gap-1 rounded-xl border border-border/80 bg-secondary/20 p-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate flex-1">{att.name || att.originalName || 'Attachment'}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {att.url && (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded p-1 text-accent hover:bg-accent/10"
                                    title="Open attachment"
                                  >
                                    <ArrowUpRight size={13} />
                                  </a>
                                )}
                                {att.url && (
                                  <button
                                    onClick={() => handleDownload(att.url, att.name || att.originalName)}
                                    className="rounded p-1 text-muted-foreground hover:bg-muted"
                                    title="Download"
                                  >
                                    <Download size={13} />
                                  </button>
                                )}
                                {attList.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveAttachment(attIdx)}
                                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    title="Remove attachment"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {isImg && (
                              <div className="overflow-hidden rounded-lg border border-border">
                                <img src={att.url} alt={att.name} className="h-24 w-full object-cover" />
                              </div>
                            )}
                            {isAudio && (
                              <audio controls src={att.url} className="h-7 w-full outline-none mt-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {r.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {r.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[9px] text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="font-semibold">{subjectLabel}</span>
                  {r.topic && <><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{r.topic}</span></>}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3 mt-4">
                  <span className="font-mono text-[10px] text-muted-foreground">{r.rating ? `${r.rating}/5 rating` : fmtDate(r.createdAt || r.addedAt)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {open && <ResourceModal onClose={() => setOpen(false)} />}
    </Shell>
  );
}

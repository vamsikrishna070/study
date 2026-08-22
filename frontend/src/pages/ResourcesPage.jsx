import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Library, Plus, FileText, Image as ImageIcon, Video, Music, File, ExternalLink, Download, Share2, Trash2, Check } from 'lucide-react';
import { getGetResourcesQueryKey, useGetResources, useDeleteResource } from '../services/apiHooks.js';
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
        // clipboard fallback
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
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
            const isFile = !!r.fileData;
            const targetUrl = isFile ? r.fileData?.url : r.url;
            const isPdf = r.fileData?.mimeType?.includes('pdf') || r.resourceType === 'Document' || r.fileData?.originalName?.endsWith('.pdf');
            const resId = r.id || r._id;
            const subjectLabel = r.customSubject || r.subject?.name || r.subject || 'General';

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
                      title="Delete resource"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <h2 className="mt-4 font-display text-xl leading-tight">{r.title}</h2>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{r.description || 'No description added.'}</p>

                {isFile && r.fileData?.mimeType?.startsWith('image/') && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border">
                    <img src={r.fileData.url} alt={r.title} className="h-32 w-full object-cover" />
                  </div>
                )}
                {isFile && (r.fileData?.mimeType?.startsWith('audio/') || r.resourceType === 'recording') && (
                  <div className="mt-4 rounded-xl bg-secondary/30 p-2 border border-border">
                    <audio controls src={r.fileData.url} className="h-8 w-full outline-none" />
                  </div>
                )}
                {isFile && r.fileData?.mimeType?.startsWith('video/') && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border">
                    <video controls src={r.fileData.url} className="h-32 w-full" />
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

                <div className="mt-auto flex items-center justify-between border-t border-border pt-4 mt-5">
                  <span className="font-mono text-[10px] text-muted-foreground">{r.rating ? `${r.rating}/5 rating` : fmtDate(r.createdAt || r.addedAt)}</span>
                  
                  <div className="flex items-center gap-2">
                    {targetUrl && (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                      >
                        {isPdf ? 'View' : isFile ? 'Open' : 'Link'} <ArrowUpRight size={13} />
                      </a>
                    )}
                    {isFile && (
                      <button
                        onClick={() => handleDownload(targetUrl, r.fileData?.originalName || r.title)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Download file"
                      >
                        <Download size={13} />
                      </button>
                    )}
                    {targetUrl && (
                      <button
                        onClick={() => handleShare(targetUrl, resId)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Share link"
                      >
                        {copiedId === resId ? <Check size={13} className="text-green-500" /> : <Share2 size={13} />}
                      </button>
                    )}
                  </div>
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

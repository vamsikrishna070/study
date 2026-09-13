import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Eye, Library, Plus, FileText, Image as ImageIcon, Video, Music, File, Film, ExternalLink, Download, Share2, Trash2, Check, X, Search } from 'lucide-react';
import { getGetResourcesQueryKey, useGetResources, useDeleteResource, useUpdateResource } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, LoadingBlock, PageHeading, QueryState, cx, fmtDate } from '../components/shared.jsx';
import ResourceModal from '../components/resources/ResourceModal.jsx';
import AttachmentCard from '../components/shared/AttachmentCard.jsx';
import { getAttachmentKind, viewDocument, getDownloadUrl, getPreviewUrl } from '../utils/documentViewer.js';

function ResourceIcon({ resource, type, mimeType }) {
  const kind = getAttachmentKind(resource?.attachments?.[0] || resource?.fileData || resource || { type, mimeType });
  switch (kind) {
    case 'instagram_reel':
    case 'instagram_post':
      return <Film size={17} className="text-pink-500" />;
    case 'linkedin_post':
      return <ExternalLink size={17} className="text-blue-600" />;
    case 'youtube':
      return <Film size={17} className="text-red-500" />;
    case 'twitter':
      return <ExternalLink size={17} className="text-sky-500" />;
    case 'github':
      return <ExternalLink size={17} className="text-foreground" />;
    case 'link':
      return <ExternalLink size={17} className="text-muted-foreground" />;
    case 'pdf':
      return <FileText size={17} className="text-orange-500" />;
    case 'presentation':
      return <File size={17} className="text-amber-500" />;
    case 'document':
      return <FileText size={17} className="text-blue-500" />;
    case 'video':
      return <Video size={17} className="text-purple-500" />;
    case 'image':
      return <ImageIcon size={17} className="text-blue-500" />;
    case 'audio':
      return <Music size={17} className="text-primary" />;
    default:
      return <File size={17} className="text-muted-foreground" />;
  }
}

export default function ResourcesPage() {
  const qc = useQueryClient();
  const query = useGetResources();
  const resources = query.data;
  const del = useDeleteResource();
  const update = useUpdateResource();

  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
      const downloadUrl = getDownloadUrl(url);
      const response = await fetch(downloadUrl);
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
      window.open(getDownloadUrl(url), '_blank');
    }
  };

  const filteredResources = (resources || []).filter((r) => {
    if (!r) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const title = String(r.title || '').toLowerCase();
    const sub = (typeof r.subject === 'object' && r.subject?.name
      ? r.subject.name
      : String(r.customSubject || r.subject || '')).toLowerCase();
    const topic = String(r.topic || '').toLowerCase();
    const type = String(r.resourceType || '').toLowerCase();
    const tags = Array.isArray(r.tags) ? r.tags.filter(Boolean).join(' ').toLowerCase() : '';
    const attNames = Array.isArray(r.attachments)
      ? r.attachments.filter(Boolean).map(a => `${a.originalName || ''} ${a.name || ''} ${a.filename || ''}`).join(' ').toLowerCase()
      : '';
    const fileDataName = String(r.fileData?.originalName || '').toLowerCase();
    return (
      title.includes(q) ||
      sub.includes(q) ||
      topic.includes(q) ||
      type.includes(q) ||
      tags.includes(q) ||
      attNames.includes(q) ||
      fileDataName.includes(q)
    );
  });

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

      {/* Search Bar */}
      {Boolean(resources?.length) && (
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources by title, attachment, subject, tags..."
              className="w-full rounded-xl border border-input bg-card pl-10 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              data-testid="input-search-resources"
            />
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <span className="font-mono text-xs text-muted-foreground">
              {filteredResources.length} result{filteredResources.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

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
      ) : !filteredResources.length ? (
        <EmptyState
          icon={Search}
          title="No resources found"
          detail={`No resources match "${searchQuery}". Try a different keyword.`}
          action={
            <Button variant="quiet" onClick={() => setSearchQuery('')} testId="button-clear-search">
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((r) => {
            const resId = r.id || r._id;
            const subjectLabel = r.customSubject || r.subject?.name || r.subject || 'General';
            const attList = (r.attachments && r.attachments.length > 0)
              ? r.attachments
              : (r.fileData?.url || r.url)
              ? [{
                  id: r.fileData?.publicId || 'legacy',
                  name: r.fileData?.originalName || r.title || 'Resource',
                  url: r.fileData?.url || r.url,
                  mimeType: r.fileData?.mimeType || '',
                  type: r.resourceType || '',
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
                    <ResourceIcon resource={r} type={r.resourceType} mimeType={r.fileData?.mimeType} />
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
                    <div className="space-y-2">
                      {attList.map((att, attIdx) => (
                        <AttachmentCard
                          key={att.id || attIdx}
                          attachment={att}
                          onRemove={attList.length > 1 ? () => handleRemoveAttachment(attIdx) : undefined}
                          readonly={attList.length <= 1}
                        />
                      ))}
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

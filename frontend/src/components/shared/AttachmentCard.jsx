import { useState, useRef } from 'react';
import {
  Mic,
  FileText,
  Image as ImageIcon,
  File,
  Film,
  Music,
  Play,
  Pause,
  ExternalLink,
  Download,
  Share2,
  Check,
  Eye,
  Trash2,
} from 'lucide-react';
import {
  viewDocument,
  getDownloadUrl,
  resolveAttachmentFileName,
  getAttachmentKind,
  getKindLabel,
  getOpenLabel,
  isLinkKind,
} from '../../utils/documentViewer';

export default function AttachmentCard({ attachment, onRemove, readonly }) {
  if (!attachment) return null;

  const kind = getAttachmentKind(attachment);
  const isAudio = kind === 'audio';
  const isImage = kind === 'image';
  const isVideo = kind === 'video';
  const isPdf = kind === 'pdf';
  const isPresentation = kind === 'presentation';
  const isDocument = kind === 'document';
  const isLink = isLinkKind(kind);

  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  const fileName = resolveAttachmentFileName(attachment);
  const kindLabel = getKindLabel(kind);
  const actionLabel = getOpenLabel(kind);

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const getIcon = () => {
    switch (kind) {
      case 'instagram_reel':
      case 'instagram_post':
        return <Film size={20} className="text-pink-500 shrink-0" />;
      case 'linkedin_post':
        return <ExternalLink size={20} className="text-blue-600 shrink-0" />;
      case 'youtube':
        return <Film size={20} className="text-red-500 shrink-0" />;
      case 'twitter':
        return <ExternalLink size={20} className="text-sky-500 shrink-0" />;
      case 'github':
        return <ExternalLink size={20} className="text-foreground shrink-0" />;
      case 'link':
        return <ExternalLink size={20} className="text-muted-foreground shrink-0" />;
      case 'pdf':
        return <FileText size={20} className="text-orange-500 shrink-0" />;
      case 'presentation':
        return <File size={20} className="text-amber-500 shrink-0" />;
      case 'document':
        return <FileText size={20} className="text-blue-500 shrink-0" />;
      case 'video':
        return <Film size={20} className="text-purple-500 shrink-0" />;
      case 'image':
        return <ImageIcon size={20} className="text-blue-500 shrink-0" />;
      case 'audio':
        return <Mic size={20} className="text-primary shrink-0" />;
      default:
        return <File size={20} className="text-muted-foreground shrink-0" />;
    }
  };

  const getActionIcon = () => {
    if (kind === 'youtube' || kind === 'video') {
      return <Play size={14} fill="currentColor" className="shrink-0" />;
    }
    if (isLink) {
      return <ExternalLink size={14} className="shrink-0" />;
    }
    return <Eye size={14} className="shrink-0" />;
  };

  const toggleAudio = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (!attachment.url) return;
    if (isLink) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
    } else {
      viewDocument(attachment.url, fileName);
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!attachment.url || isLink) return;
    try {
      const downloadUrl = getDownloadUrl(attachment.url);
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(getDownloadUrl(attachment.url), '_blank');
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    if (!attachment.url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: fileName,
          url: attachment.url,
        });
        return;
      } catch {
        // Fallback to clipboard if share canceled or not permitted
      }
    }

    try {
      await navigator.clipboard.writeText(attachment.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard copy failed
    }
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-accent/40">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40">
          {getIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-foreground" title={fileName}>
            {fileName}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="uppercase font-mono text-[10px] font-semibold text-accent">
              {kindLabel}
            </span>
            {attachment.size > 0 && !isLink && (
              <>
                <span>•</span>
                <span className="font-mono">{formatSize(attachment.size)}</span>
              </>
            )}
            {attachment.duration > 0 && (
              <>
                <span>•</span>
                <span className="font-mono">{Math.floor(attachment.duration / 60)}:{(attachment.duration % 60).toString().padStart(2, '0')}</span>
              </>
            )}
          </div>
        </div>

        {onRemove && !readonly && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 transition-colors"
            title="Remove attachment"
            aria-label={`Remove ${fileName}`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {isImage && attachment.url && (
        <div className="overflow-hidden rounded-lg border border-border mt-0.5">
          <img src={attachment.url} alt={fileName} className="h-28 w-full object-cover" />
        </div>
      )}

      {/* Action Row */}
      {isAudio && attachment.url ? (
        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={toggleAudio}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
            title={isPlaying ? 'Pause voice note' : 'Play voice note'}
            aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
          >
            {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            <span>{isPlaying ? 'Pause Voice Note' : 'Play Voice Note'}</span>
          </button>
          {onRemove && !readonly && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Remove recording"
              aria-label="Remove recording"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-0.5">
          {attachment.url && (
            <button
              type="button"
              onClick={handleOpen}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
              title={`${actionLabel} - ${fileName}`}
              aria-label={`${actionLabel} - ${fileName}`}
            >
              {getActionIcon()}
              <span>{actionLabel}</span>
            </button>
          )}

          {attachment.url && (
            <div className="flex items-center gap-1 shrink-0">
              {!isLink && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex h-8 items-center gap-1 rounded-lg border border-border bg-secondary/40 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Download file"
                  aria-label={`Download ${fileName}`}
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">Download</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleShare}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/40 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="Share link"
                aria-label={`Share ${fileName}`}
              >
                {copied ? <Check size={13} className="text-green-500" /> : <Share2 size={13} />}
              </button>
            </div>
          )}
        </div>
      )}

      {isAudio && attachment.url && (
        <audio
          ref={audioRef}
          src={attachment.url}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          className="hidden"
        />
      )}
    </div>
  );
}


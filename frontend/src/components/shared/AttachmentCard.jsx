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
import { Button } from '../shared.jsx';
import { viewDocument, getDownloadUrl, resolveAttachmentFileName } from '../../utils/documentViewer';

export default function AttachmentCard({ attachment, onRemove, readonly }) {
  if (!attachment) return null;

  const isRecording = attachment.type === 'recording' || attachment.mimeType?.includes('audio');
  const isImage = attachment.type === 'image' || attachment.mimeType?.includes('image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(attachment.url || '');
  const isVideo = attachment.type === 'video' || attachment.mimeType?.includes('video') || /\.(mp4|webm|mov|mkv)$/i.test(attachment.url || '');
  const isYoutube = attachment.type === 'youtube' || attachment.mimeType?.includes('youtube') || /youtube\.com|youtu\.be/i.test(attachment.url || '');
  const isPdf = attachment.mimeType?.includes('pdf') || /\.pdf$/i.test(attachment.originalName || attachment.name || attachment.url || '');
  const isPresentation = attachment.mimeType?.includes('presentation') || /\.(ppt|pptx)$/i.test(attachment.originalName || attachment.name || attachment.url || '');
  const isDocument = isPdf || isPresentation || attachment.type === 'document' ||
    attachment.mimeType?.includes('document') ||
    attachment.mimeType?.includes('msword') ||
    attachment.mimeType?.includes('officedocument') ||
    /\.(doc|docx|txt|rtf|xls|xlsx)$/i.test(attachment.originalName || attachment.name || attachment.url || '');

  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  const fileName = resolveAttachmentFileName(
    attachment,
    isPdf ? 'document.pdf' : isImage ? 'image.png' : isRecording ? 'Voice Note' : 'Attachment'
  );

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const getIcon = () => {
    if (isRecording) return <Mic size={20} className="text-primary shrink-0" />;
    if (isImage) return <ImageIcon size={20} className="text-blue-500 shrink-0" />;
    if (isVideo || isYoutube) return <Film size={20} className="text-purple-500 shrink-0" />;
    if (isPdf) return <FileText size={20} className="text-orange-500 shrink-0" />;
    if (isPresentation) return <File size={20} className="text-amber-500 shrink-0" />;
    if (isDocument) return <FileText size={20} className="text-orange-500 shrink-0" />;
    return <File size={20} className="text-muted-foreground shrink-0" />;
  };

  const getTypeLabel = () => {
    if (isPdf) return 'PDF';
    if (isImage) return 'Image';
    if (isRecording) return 'Voice Note';
    if (isYoutube) return 'YouTube';
    if (isVideo) return 'Video';
    if (isPresentation) return 'Presentation';
    if (isDocument) return 'Document';
    if (attachment.type === 'link') return 'Link';
    return attachment.type || (attachment.mimeType ? attachment.mimeType.split('/')[1] : 'File');
  };

  const getPrimaryAction = () => {
    if (isPdf) {
      return { label: 'View PDF', icon: <Eye size={14} className="shrink-0" /> };
    }
    if (isImage) {
      return { label: 'View Image', icon: <Eye size={14} className="shrink-0" /> };
    }
    if (isYoutube) {
      return { label: 'Open Video', icon: <ExternalLink size={14} className="shrink-0" /> };
    }
    if (isVideo) {
      return { label: 'Play Video', icon: <Play size={14} fill="currentColor" className="shrink-0" /> };
    }
    if (isPresentation) {
      return { label: 'View Presentation', icon: <Eye size={14} className="shrink-0" /> };
    }
    if (isDocument) {
      return { label: 'View Document', icon: <Eye size={14} className="shrink-0" /> };
    }
    if (attachment.type === 'link') {
      return { label: 'Open Link', icon: <ExternalLink size={14} className="shrink-0" /> };
    }
    return { label: 'View File', icon: <Eye size={14} className="shrink-0" /> };
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

  const handleView = (e) => {
    e.stopPropagation();
    if (attachment.url) {
      viewDocument(attachment.url, fileName);
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!attachment.url) return;
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

  const { label: actionLabel, icon: actionIcon } = getPrimaryAction();

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
              {getTypeLabel()}
            </span>
            {attachment.size > 0 && (
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
      {isRecording && attachment.url ? (
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
              onClick={handleView}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
              title={`${actionLabel} - ${fileName}`}
              aria-label={`${actionLabel} - ${fileName}`}
            >
              {actionIcon}
              <span>{actionLabel}</span>
            </button>
          )}

          {attachment.url && (
            <div className="flex items-center gap-1 shrink-0">
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

      {isRecording && attachment.url && (
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


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
import { viewDocument, getDownloadUrl } from '../../utils/documentViewer';

export default function AttachmentCard({ attachment, onRemove, readonly }) {
  const isRecording = attachment.type === 'recording' || attachment.mimeType?.includes('audio');
  const isImage = attachment.type === 'image' || attachment.mimeType?.includes('image');
  const isVideo = attachment.type === 'video' || attachment.mimeType?.includes('video');
  const isDoc = attachment.type === 'document' ||
    attachment.mimeType?.includes('pdf') ||
    attachment.mimeType?.includes('document') ||
    attachment.mimeType?.includes('presentation') ||
    attachment.mimeType?.includes('msword') ||
    attachment.mimeType?.includes('officedocument') ||
    /\.(pdf|ppt|pptx|doc|docx|txt|rtf|xls|xlsx)$/i.test(attachment.originalName || attachment.name || '');
  const isYoutube = attachment.type === 'youtube' || attachment.mimeType?.includes('youtube');

  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const getIcon = () => {
    if (isRecording) return <Mic size={20} className="text-primary shrink-0" />;
    if (isImage) return <ImageIcon size={20} className="text-blue-500 shrink-0" />;
    if (isVideo || isYoutube) return <Film size={20} className="text-purple-500 shrink-0" />;
    if (isDoc) return <FileText size={20} className="text-orange-500 shrink-0" />;
    return <File size={20} className="text-muted-foreground shrink-0" />;
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
      viewDocument(attachment.url);
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
      link.download = attachment.originalName || attachment.name || attachment.title || 'download';
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
          title: attachment.originalName || attachment.name || 'StudyArena File',
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

  const fileName = attachment.originalName || attachment.name || attachment.title || 'Attachment';

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-accent/40">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/40">
          {getIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-foreground" title={fileName}>
            {fileName}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="uppercase font-mono text-[10px]">
              {attachment.type || (attachment.mimeType ? attachment.mimeType.split('/')[1] : 'File')}
            </span>
            {attachment.size > 0 && (
              <>
                <span>•</span>
                <span>{formatSize(attachment.size)}</span>
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

        <div className="flex shrink-0 items-center gap-1">
          {isRecording && attachment.url && (
            <Button
              type="button"
              variant="quiet"
              onClick={toggleAudio}
              className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-accent hover:bg-accent/15 shrink-0"
              title={isPlaying ? 'Pause voice note' : 'Play voice note'}
              aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
            >
              {isPlaying ? <Pause size={14} fill="currentColor" className="shrink-0" /> : <Play size={14} fill="currentColor" className="shrink-0" />}
            </Button>
          )}

          {isDoc && attachment.url && (
            <>
              <Button
                type="button"
                variant="quiet"
                onClick={handleView}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted gap-1.5 shrink-0"
                title="View document"
                aria-label="View document"
              >
                <Eye size={13} className="shrink-0" />
                <span>View</span>
              </Button>
              <Button
                type="button"
                variant="quiet"
                onClick={handleDownload}
                className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                title="Download file"
                aria-label="Download file"
              >
                <Download size={14} className="shrink-0" />
              </Button>
              <Button
                type="button"
                variant="quiet"
                onClick={handleShare}
                className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                title="Share link"
                aria-label="Share link"
              >
                {copied ? <Check size={14} className="text-green-500 shrink-0" /> : <Share2 size={14} className="shrink-0" />}
              </Button>
            </>
          )}

          {!isRecording && !isDoc && (attachment.url || attachment.file) && (
            <>
              <Button
                type="button"
                variant="quiet"
                onClick={handleView}
                className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                title="Open attachment"
                aria-label="Open attachment"
              >
                <ExternalLink size={14} className="shrink-0" />
              </Button>
              {attachment.url && (
                <Button
                  type="button"
                  variant="quiet"
                  onClick={handleDownload}
                  className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                  title="Download file"
                  aria-label="Download file"
                >
                  <Download size={14} className="shrink-0" />
                </Button>
              )}
            </>
          )}

          {onRemove && !readonly && (
            <Button
              type="button"
              variant="quiet"
              onClick={onRemove}
              className="h-8 w-8 rounded-full p-0 flex items-center justify-center text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
              title="Remove attachment"
              aria-label="Remove attachment"
            >
              <Trash2 size={14} className="shrink-0" />
            </Button>
          )}
        </div>
      </div>

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

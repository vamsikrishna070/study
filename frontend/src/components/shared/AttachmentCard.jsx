import { useState, useRef } from 'react';
import { Mic, FileText, Image as ImageIcon, File, Film, Music, X, Play, Pause, ExternalLink, Download, Share2, Check } from 'lucide-react';
import { Button } from '../shared.jsx';
import { viewDocument, getDownloadUrl } from '../../utils/documentViewer';

export default function AttachmentCard({ attachment, onRemove, readonly }) {
  const isRecording = attachment.type === 'recording' || attachment.mimeType?.includes('audio');
  const isImage = attachment.type === 'image' || attachment.mimeType?.includes('image');
  const isVideo = attachment.type === 'video' || attachment.mimeType?.includes('video');
  const isDoc = attachment.type === 'document' || attachment.mimeType?.includes('pdf') || attachment.mimeType?.includes('document') || attachment.originalName?.toLowerCase().endsWith('.pdf');
  const isYoutube = attachment.type === 'youtube' || attachment.mimeType?.includes('youtube');

  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const getIcon = () => {
    if (isRecording) return <Mic size={22} className="text-primary" />;
    if (isImage) return <ImageIcon size={22} className="text-blue-500" />;
    if (isVideo || isYoutube) return <Film size={22} className="text-purple-500" />;
    if (isDoc) return <FileText size={22} className="text-orange-500" />;
    return <File size={22} className="text-muted-foreground" />;
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
      link.download = attachment.originalName || attachment.title || 'download';
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
          title: attachment.originalName || 'StudyArena File',
          url: attachment.url,
        });
        return;
      } catch {
        // Fallback to clipboard below
      }
    }

    try {
      await navigator.clipboard.writeText(attachment.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-accent/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/40">
          {getIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {attachment.originalName || attachment.title || 'Attachment'}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
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

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          {isRecording && attachment.url && (
            <Button
              type="button"
              variant="quiet"
              onClick={toggleAudio}
              className="h-8 w-8 rounded-full p-0 text-accent hover:bg-accent/15"
              title={isPlaying ? 'Pause' : 'Play Voice Note'}
            >
              {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
            </Button>
          )}

          {isDoc && attachment.url && (
            <>
              <Button
                type="button"
                variant="quiet"
                onClick={handleView}
                className="h-8 px-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                title="View PDF"
              >
                View
              </Button>
              <Button
                type="button"
                variant="quiet"
                onClick={handleDownload}
                className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Download PDF"
              >
                <Download size={14} />
              </Button>
              <Button
                type="button"
                variant="quiet"
                onClick={handleShare}
                className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Share link"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Share2 size={14} />}
              </Button>
            </>
          )}

          {!isRecording && !isDoc && (attachment.url || attachment.file) && (
            <Button
              type="button"
              variant="quiet"
              onClick={handleView}
              className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Open link"
            >
              <ExternalLink size={14} />
            </Button>
          )}

          {onRemove && !readonly && (
            <Button
              type="button"
              variant="quiet"
              onClick={onRemove}
              className="h-8 w-8 rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Remove attachment"
            >
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Hidden audio element for playback */}
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

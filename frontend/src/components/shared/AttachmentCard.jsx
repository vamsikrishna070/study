import { Mic, FileText, Image as ImageIcon, File, Film, Music, X, Play, ExternalLink } from 'lucide-react';
import { Button } from '../shared.jsx';

export default function AttachmentCard({ attachment, onRemove }) {
  const isRecording = attachment.type === 'recording' || attachment.mimeType?.includes('audio');
  const isImage = attachment.type === 'image' || attachment.mimeType?.includes('image');
  const isVideo = attachment.type === 'video' || attachment.mimeType?.includes('video');
  const isDoc = attachment.type === 'document' || attachment.mimeType?.includes('pdf') || attachment.mimeType?.includes('document');
  const isYoutube = attachment.type === 'youtube' || attachment.mimeType?.includes('youtube');

  const formatSize = (bytes) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const getIcon = () => {
    if (isRecording) return <Mic size={24} className="text-primary" />;
    if (isImage) return <ImageIcon size={24} className="text-blue-500" />;
    if (isVideo || isYoutube) return <Film size={24} className="text-purple-500" />;
    if (isDoc) return <FileText size={24} className="text-orange-500" />;
    return <File size={24} className="text-muted-foreground" />;
  };

  const openAttachment = () => {
    if (attachment.url) window.open(attachment.url, '_blank');
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted/30">
        {getIcon()}
      </div>
      
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-none">{attachment.originalName || attachment.title || 'Attachment'}</p>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase">{attachment.type || (attachment.mimeType ? attachment.mimeType.split('/')[1] : 'File')}</span>
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
        {(attachment.url || attachment.file) && (
          <Button variant="quiet" onClick={openAttachment} className="h-8 w-8 rounded-full p-0">
            {isRecording || isVideo || isYoutube ? <Play size={15} /> : <ExternalLink size={15} />}
          </Button>
        )}
        {onRemove && (
          <Button variant="quiet" onClick={onRemove} className="h-8 w-8 rounded-full p-0 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <X size={15} />
          </Button>
        )}
      </div>
    </div>
  );
}

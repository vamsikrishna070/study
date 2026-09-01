import { useState } from 'react';
import {
  FileText,
  Eye,
  Download,
  Share2,
  RefreshCw,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-react';
import { Button, cx } from '../shared.jsx';
import { viewDocument, getDownloadUrl } from '../../utils/documentViewer';

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DocumentPreviewCard({
  file,
  title = 'Syllabus PDF',
  unitCount = 0,
  topicCount = 0,
  isExtracting = false,
  extractionError = null,
  onReplace,
  onRemove,
  onExtract,
  accentColor = 'var(--accent, #d97706)',
  className = '',
}) {
  const [viewing, setViewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  if (!file || !file.url) {
    return null;
  }

  const originalName = file.originalName || 'Syllabus.pdf';
  const sizeText = formatSize(file.size);

  const handleView = () => {
    setViewing(true);
    try {
      viewDocument(file.url);
    } finally {
      setTimeout(() => setViewing(false), 500);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {

      const downloadUrl = getDownloadUrl(file.url);
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {

      const downloadUrl = getDownloadUrl(file.url);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: originalName,
          text: `StudyArena Syllabus: ${originalName}`,
          url: file.url,
        });
      } else {
        await navigator.clipboard.writeText(file.url);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(file.url);
          setShareSuccess(true);
          setTimeout(() => setShareSuccess(false), 3000);
        } catch (copyErr) {

        }
      }
    } finally {
      setSharing(false);
    }
  };

  const handleConfirmRemove = () => {
    if (confirm('Remove Syllabus PDF?\n\nThis will remove the attached syllabus document from this subject. You can upload a new syllabus at any time.')) {
      onRemove?.();
    }
  };

  return (
    <div className={cx('rounded-2xl border border-card-border bg-card p-5 shadow-sm transition-all', className)}>

      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}1A` }}
        >
          <FileText size={24} style={{ color: accentColor }} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold text-foreground" title={originalName}>
            {originalName}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">PDF Document</span>
            {!!sizeText && <span>•</span>}
            {!!sizeText && <span className="font-mono">{sizeText}</span>}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {isExtracting ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2.5 text-xs font-medium text-primary">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Extracting syllabus units & topics...</span>
          </div>
        ) : unitCount > 0 ? (
          <div
            className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-semibold"
            style={{
              backgroundColor: `${accentColor}12`,
              borderColor: `${accentColor}35`,
              color: accentColor
            }}
          >
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{unitCount} Units • {topicCount} Topics extracted</span>
          </div>
        ) : extractionError ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            <span className="truncate">{extractionError}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-xs font-medium text-muted-foreground">
            <Sparkles size={16} className="shrink-0" />
            <span>Syllabus uploaded • Ready to extract</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={handleView}
          disabled={viewing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: accentColor }}
        >
          {viewing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
          <span>{viewing ? 'Opening…' : 'View PDF'}</span>
        </button>

        {unitCount === 0 && onExtract && (
          <button
            type="button"
            onClick={onExtract}
            disabled={isExtracting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-secondary disabled:opacity-60"
            style={{ borderColor: accentColor, color: accentColor }}
          >
            {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{isExtracting ? 'Extracting…' : 'Extract Topics'}</span>
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-card-border pt-3 text-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className={cx(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-colors hover:bg-secondary',
              downloadSuccess ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            )}
            title="Download PDF"
          >
            {downloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : downloadSuccess ? (
              <Check size={14} className="text-accent" />
            ) : (
              <Download size={14} />
            )}
            <span>{downloading ? 'Saving…' : downloadSuccess ? 'Saved' : 'Download'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className={cx(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium transition-colors hover:bg-secondary',
              shareSuccess ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            )}
            title="Share PDF link"
          >
            {sharing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : shareSuccess ? (
              <Check size={14} className="text-accent" />
            ) : (
              <Share2 size={14} />
            )}
            <span>{sharing ? 'Sharing…' : shareSuccess ? 'Copied' : 'Share'}</span>
          </button>

          {onReplace && (
            <button
              type="button"
              onClick={onReplace}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Replace syllabus PDF"
            >
              <RefreshCw size={14} />
              <span>Replace</span>
            </button>
          )}
        </div>

        {onRemove && (
          <button
            type="button"
            onClick={handleConfirmRemove}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium text-destructive transition-colors hover:bg-destructive/10"
            title="Remove syllabus PDF"
          >
            <Trash2 size={14} />
            <span>Remove</span>
          </button>
        )}
      </div>
    </div>
  );
}

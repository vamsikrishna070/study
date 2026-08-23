import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Layers, 
  CloudUpload, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  BookOpen, 
  Upload 
} from 'lucide-react';
import apiClient from '../services/apiClient.js';
import { uploadFile } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { PageHeading, Button, LoadingBlock, QueryState, cx } from '../components/shared.jsx';
import { DocumentPreviewCard } from '../components/shared/DocumentPreviewCard.jsx';
import SyllabusReviewModal from '../components/subjects/SyllabusReviewModal.jsx';

export default function Syllabus() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSubjectId = searchParams.get('subject') || '';

  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState(null);
  const [expandedUnits, setExpandedUnits] = useState({});

  // Extraction & Upload state
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionStep, setExtractionStep] = useState('');
  const [reviewVisible, setReviewVisible] = useState(false);
  const [parsedUnits, setParsedUnits] = useState([]);
  const [extractionError, setExtractionError] = useState(null);

  const fileInputRef = useRef(null);

  const loadData = useCallback(async (targetSubjId = subjectId) => {
    try {
      setError(null);
      const subsRes = await apiClient.get('/subjects');
      const subsData = subsRes.data?.data || subsRes.data || [];
      setAllSubjects(subsData);

      const activeId = targetSubjId || (subsData.length > 0 ? (subsData[0]._id || subsData[0].id) : '');
      if (!subjectId && activeId) {
        setSubjectId(activeId);
      }

      if (!activeId) {
        setLoading(false);
        return;
      }

      const [unitsRes, topicsRes] = await Promise.all([
        apiClient.get(`/units?subjectId=${activeId}`),
        apiClient.get(`/topics?subjectId=${activeId}`),
      ]);

      const unitsData = unitsRes.data?.data || unitsRes.data || [];
      const topicsData = topicsRes.data?.data || topicsRes.data || [];
      setUnits(unitsData);
      setTopics(topicsData);

      if (unitsData.length > 0) {
        // Expand first unit by default
        const firstId = unitsData[0]._id || unitsData[0].id;
        setExpandedUnits(prev => ({ [firstId]: true, ...prev }));
      }
    } catch (e) {
      setError('Failed to load syllabus data.');
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadData(subjectId);
  }, [subjectId, loadData]);

  const currentSubject = allSubjects.find((s) => (s._id || s.id) === subjectId);
  const subjectColor = currentSubject?.color || 'var(--accent, #d97706)';

  // Handle PDF file selection from native file picker
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input value so same file can be picked again
    e.target.value = '';

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a valid PDF syllabus document.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('The syllabus PDF must be smaller than 25 MB.');
      return;
    }

    if (!subjectId) {
      alert('Please select a subject before uploading a syllabus.');
      return;
    }

    try {
      setUploadingPdf(true);
      setExtractionError(null);
      setExtractionStep('Uploading syllabus PDF...');

      // 1. Upload file to backend
      const uploaded = await uploadFile(file);
      if (!uploaded || !uploaded.url) {
        throw new Error('File upload failed.');
      }

      // 2. Save syllabusFile on subject
      setExtractionStep('Attaching to subject...');
      await apiClient.patch(`/subjects/${subjectId}`, {
        syllabusFile: {
          url: uploaded.url,
          publicId: uploaded.publicId || '',
          originalName: uploaded.originalName || file.name,
          mimeType: uploaded.mimeType || 'application/pdf',
          size: uploaded.size || file.size,
        },
      });

      // 3. Extract syllabus structure using backend extractor
      setExtractionStep('Extracting units & topics from syllabus...');
      setExtracting(true);
      
      const res = await apiClient.post(`/subjects/${subjectId}/syllabus/extract`);
      const extracted = res.data?.data?.units || res.data?.units || [];

      if (extracted.length > 0) {
        setParsedUnits(extracted);
        setReviewVisible(true);
      } else {
        alert('Syllabus PDF was uploaded successfully. Text extraction could not automatically detect structured units, but your document is safely attached.');
      }

      loadData(subjectId);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not extract the syllabus. Please make sure the PDF contains readable syllabus text.';
      setExtractionError(msg);
      alert(msg);
    } finally {
      setUploadingPdf(false);
      setExtracting(false);
      setExtractionStep('');
    }
  };

  // Re-extract from currently attached PDF
  const handleExtractExisting = async () => {
    if (!currentSubject?.syllabusFile?.url) return;
    setExtracting(true);
    setExtractionError(null);
    setExtractionStep('Extracting units & topics...');

    try {
      const res = await apiClient.post(`/subjects/${subjectId}/syllabus/extract`);
      const extracted = res.data?.data?.units || res.data?.units || [];

      if (extracted.length > 0) {
        setParsedUnits(extracted);
        setReviewVisible(true);
      } else {
        alert('Could not detect structured units from this PDF. You can add units manually.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not extract the syllabus. Please make sure the PDF contains readable syllabus text.';
      setExtractionError(msg);
      alert(msg);
    } finally {
      setExtracting(false);
      setExtractionStep('');
    }
  };

  // Remove attached syllabus PDF
  const handleRemoveSyllabus = async () => {
    if (!subjectId) return;
    try {
      await apiClient.patch(`/subjects/${subjectId}`, {
        syllabusFile: { url: '', publicId: '', originalName: '', mimeType: '', size: 0 },
      });
      loadData(subjectId);
    } catch (err) {
      alert('Failed to remove syllabus PDF.');
    }
  };

  // Toggle topic completion state
  const toggleTopic = async (topic) => {
    const isCompleted = topic.status === 'completed' || topic.completed;
    const newStatus = isCompleted ? 'not-started' : 'completed';
    const topicId = topic._id || topic.id;

    // Optimistic UI update
    setTopics((prev) =>
      prev.map((t) =>
        (t._id || t.id) === topicId
          ? { ...t, status: newStatus, completed: !isCompleted }
          : t
      )
    );

    try {
      await apiClient.patch(`/topics/${topicId}`, { 
        status: newStatus,
        completed: !isCompleted 
      });
    } catch (e) {
      // Revert state on error
      setTopics((prev) =>
        prev.map((t) =>
          (t._id || t.id) === topicId
            ? { ...t, status: topic.status, completed: topic.completed }
            : t
        )
      );
      alert('Failed to update topic status. Please try again.');
    }
  };

  const toggleUnit = (uId) => {
    setExpandedUnits((prev) => ({ ...prev, [uId]: !prev[uId] }));
  };

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.status === 'completed' || t.completed).length;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <Shell>
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <PageHeading
        eyebrow="The curriculum"
        title="Syllabus"
        detail={
          currentSubject
            ? `Tracking curriculum & topics for ${currentSubject.name}`
            : 'Select a subject and upload a PDF syllabus.'
        }
        action={
          subjectId && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPdf || extracting}
              className="gap-2 shadow-sm"
            >
              {uploadingPdf || extracting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span>
                {uploadingPdf ? 'Uploading…' : extracting ? 'Extracting…' : 'Upload PDF'}
              </span>
            </Button>
          )
        }
      />

      {/* Subject Selector Bar */}
      {allSubjects.length > 0 && (
        <div className="mt-6 mb-8 flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex flex-1 items-center gap-3">
            <label htmlFor="subject-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
              Subject:
            </label>
            <select
              id="subject-select"
              value={subjectId}
              onChange={(e) => {
                const newId = e.target.value;
                setSubjectId(newId);
                setSearchParams(newId ? { subject: newId } : {});
                setUnits([]);
                setTopics([]);
              }}
              className="h-11 min-w-0 flex-1 rounded-xl border border-card-border bg-background px-4 text-sm font-medium outline-none focus:border-primary sm:max-w-md"
            >
              {allSubjects.map((s) => {
                const sId = s._id || s.id;
                return (
                  <option key={sId} value={sId}>
                    {s.name} ({s.code}) {s.credits ? `• ${s.credits} Credits` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {currentSubject && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor }} />
              <span className="font-semibold text-foreground">{currentSubject.code}</span>
              <span>·</span>
              <span>Semester {currentSubject.semester || 1}</span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <LoadingBlock lines={8} />
      ) : error ? (
        <QueryState error={error} onRetry={() => loadData(subjectId)} label="Syllabus" />
      ) : !allSubjects.length ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-12 text-center">
          <BookOpen size={48} className="mx-auto text-muted-foreground opacity-50 mb-4" />
          <h2 className="font-display text-2xl">No Subjects Found</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Create your first subject before uploading a syllabus.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Extraction Progress Banner */}
          {(uploadingPdf || extracting) && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-5 text-sm font-semibold text-primary animate-pulse">
              <Loader2 size={20} className="animate-spin shrink-0" />
              <div>
                <p className="font-bold">{extractionStep || 'Processing syllabus PDF…'}</p>
                <p className="text-xs font-normal opacity-85 mt-0.5">
                  Our universal syllabus parser is structuring your course curriculum into units & topics.
                </p>
              </div>
            </div>
          )}

          {/* Attached Syllabus Document Preview Card OR Upload Prompt */}
          {currentSubject?.syllabusFile?.url ? (
            <DocumentPreviewCard
              file={currentSubject.syllabusFile}
              title="Syllabus PDF"
              unitCount={units.length}
              topicCount={totalTopics}
              isExtracting={extracting}
              extractionError={extractionError}
              onReplace={() => fileInputRef.current?.click()}
              onRemove={handleRemoveSyllabus}
              onExtract={units.length === 0 ? handleExtractExisting : null}
              accentColor={subjectColor}
            />
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-2xl border-2 border-dashed border-card-border bg-card p-8 text-center transition-all hover:border-primary/60 hover:bg-card/90"
            >
              <div 
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${subjectColor}1A` }}
              >
                <CloudUpload size={28} style={{ color: subjectColor }} />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Attach Syllabus Document</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Upload your course PDF to automatically extract units and topics into your study plan
              </p>
              <div className="mt-4">
                <span 
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: subjectColor }}
                >
                  <Upload size={14} /> Choose PDF File
                </span>
              </div>
            </div>
          )}

          {/* Overall Completion Progress Card */}
          {totalTopics > 0 && (
            <div className="rounded-2xl border border-card-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-foreground">Overall Completion</span>
                <span className="font-mono text-base font-bold" style={{ color: subjectColor }}>
                  {progressPercent}%
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%`, backgroundColor: subjectColor }}
                />
              </div>
              <p className="mt-2.5 text-xs text-muted-foreground">
                {completedTopics} of {totalTopics} topics completed
              </p>
            </div>
          )}

          {/* Units & Topics Accordion List */}
          {units.length === 0 ? (
            <div className="rounded-2xl border border-card-border bg-card p-10 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Layers size={24} />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">No Units Extracted</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                {currentSubject?.syllabusFile?.url
                  ? 'Extract units and topics from your attached syllabus PDF to start tracking your curriculum.'
                  : 'Upload a PDF syllabus to track each unit and topic.'}
              </p>
              {currentSubject?.syllabusFile?.url && (
                <div className="mt-5">
                  <Button
                    onClick={handleExtractExisting}
                    disabled={extracting}
                    className="gap-2 shadow-sm"
                  >
                    {extracting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    <span>Extract Topics from PDF</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {units.map((unit, index) => {
                const uId = unit._id || unit.id || String(index);
                const isExpanded = !!expandedUnits[uId];
                const unitTopics = topics.filter(
                  (t) => (t.unit?._id || t.unit?.id || t.unit) === uId || t.unit === unit.title || t.unit === unit.name
                );
                const completedInUnit = unitTopics.filter((t) => t.status === 'completed' || t.completed).length;

                return (
                  <div key={uId} className="rounded-2xl border border-card-border bg-card overflow-hidden shadow-sm transition-all">
                    {/* Unit Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleUnit(uId)}
                      className="flex w-full items-center p-4 text-left hover:bg-secondary/40 transition-colors"
                    >
                      <div 
                        className="mr-3.5 flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-bold font-mono"
                        style={{ backgroundColor: `${subjectColor}1A`, color: subjectColor }}
                      >
                        U{index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-display text-base font-bold text-foreground">
                          {unit.title || unit.name || `Unit ${index + 1}`}
                        </h4>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {completedInUnit} / {unitTopics.length} completed
                        </p>
                      </div>
                      <div className="ml-3 text-muted-foreground">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </div>
                    </button>

                    {/* Expandable Topics List */}
                    {isExpanded && (
                      <div className="border-t border-card-border bg-background/50 px-4 py-2">
                        {unitTopics.length === 0 ? (
                          <p className="py-3 text-xs italic text-muted-foreground text-center">
                            No topics in this unit.
                          </p>
                        ) : (
                          <div className="divide-y divide-card-border/60">
                            {unitTopics.map((topic, tIdx) => {
                              const isDone = topic.status === 'completed' || topic.completed;
                              const topicKey = topic._id || topic.id || tIdx;

                              return (
                                <div
                                  key={topicKey}
                                  onClick={() => toggleTopic(topic)}
                                  className="group flex cursor-pointer items-start gap-3 py-2.5 transition-colors hover:bg-secondary/30 rounded-lg px-2 -mx-2"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTopic(topic);
                                    }}
                                    className="mt-0.5 shrink-0 transition-transform active:scale-90"
                                  >
                                    {isDone ? (
                                      <CheckCircle2 size={18} style={{ color: subjectColor }} />
                                    ) : (
                                      <Circle size={18} className="text-muted-foreground opacity-60 group-hover:opacity-100" />
                                    )}
                                  </button>
                                  <span
                                    className={cx(
                                      'text-sm leading-relaxed transition-all select-none',
                                      isDone
                                        ? 'line-through text-muted-foreground opacity-70'
                                        : 'text-foreground'
                                    )}
                                  >
                                    {topic.title || topic.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Syllabus Review & Confirmation Modal */}
      {reviewVisible && subjectId && (
        <SyllabusReviewModal
          subjectId={subjectId}
          parsedData={{ units: parsedUnits }}
          onClose={() => {
            setReviewVisible(false);
            setParsedUnits([]);
          }}
          onSuccess={() => {
            setReviewVisible(false);
            setParsedUnits([]);
            loadData(subjectId);
          }}
        />
      )}
    </Shell>
  );
}

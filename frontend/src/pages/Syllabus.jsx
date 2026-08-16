import { useEffect, useMemo, useState } from 'react';
import Shell from '../components/Shell.jsx';
import { PageHeading } from '../components/shared.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('village_token');
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

function ProgressBar({ value = 0 }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function TopicRow({ topic, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(topic._id)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-muted/50"
    >
      <span
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs',
          topic.completed
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-card-border',
        ].join(' ')}
      >
        {topic.completed ? '✓' : ''}
      </span>

      <span
        className={
          topic.completed
            ? 'text-sm text-muted-foreground line-through'
            : 'text-sm text-foreground'
        }
      >
        {topic.name}
      </span>
    </button>
  );
}

function UnitCard({ unit, onToggleTopic }) {
  const topics = unit.topics || [];

  const completed = topics.filter((topic) => topic.completed).length;

  const progress =
    topics.length > 0 ? Math.round((completed / topics.length) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-card-border bg-card">
      <div className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Unit
            </p>

            <h3 className="mt-1 text-xl font-semibold text-foreground">
              {unit.name}
            </h3>
          </div>

          <div className="min-w-[120px]">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>
                {completed}/{topics.length} topics
              </span>

              <span>{progress}%</span>
            </div>

            <ProgressBar value={progress} />
          </div>
        </div>
      </div>

      {topics.length > 0 && (
        <div className="border-t border-card-border px-3 py-3">
          {topics.map((topic) => (
            <TopicRow
              key={topic._id}
              topic={topic}
              onToggle={onToggleTopic}
            />
          ))}
        </div>
      )}

      {topics.length === 0 && (
        <div className="border-t border-card-border p-5 text-sm text-muted-foreground">
          No topics found in this unit.
        </div>
      )}
    </div>
  );
}

function UploadModal({ subjects, onClose, onUploaded }) {
  const [subjectId, setSubjectId] = useState('');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function selectFile(selectedFile) {
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setError('Please upload a PDF syllabus.');
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('The syllabus PDF must be smaller than 15 MB.');
      return;
    }

    setError('');
    setFile(selectedFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!subjectId) {
      setError('Please select a subject.');
      return;
    }

    if (!file) {
      setError('Please select a syllabus PDF.');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const formData = new FormData();
      formData.append('syllabus', file);
      formData.append('subjectId', subjectId);

      const result = await apiRequest('/syllabus/upload', {
        method: 'POST',
        body: formData,
      });

      onUploaded(result.syllabus || result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-card-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-card-border px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Syllabus
            </p>

            <h2 className="mt-1 text-2xl font-semibold text-foreground">
              Upload syllabus
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-y-auto p-6"
        >
          <label className="mb-2 block text-sm font-medium text-foreground">
            Subject
          </label>

          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="mb-6 h-12 w-full rounded-xl border border-card-border bg-background px-4 text-foreground outline-none focus:border-primary"
          >
            <option value="">Select subject</option>

            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>

          <label
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              selectFile(event.dataTransfer.files?.[0]);
            }}
            className={[
              'flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-card-border hover:border-primary/50',
            ].join(' ')}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => selectFile(event.target.files?.[0])}
            />

            <div className="mb-3 text-4xl">📄</div>

            {file ? (
              <>
                <p className="font-medium text-foreground">
                  {file.name}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">
                  Drop your syllabus PDF here
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  or click to browse
                </p>

                <p className="mt-3 text-xs text-muted-foreground">
                  PDF only • Maximum 15 MB
                </p>
              </>
            )}
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-card-border px-5 py-3 font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? 'Scanning syllabus...' : 'Upload & Scan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Syllabus() {
  const [subjects, setSubjects] = useState([]);
  const [syllabi, setSyllabi] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');

  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const [subjectsResponse, syllabusResponse] = await Promise.all([
        apiRequest('/subjects'),
        apiRequest('/syllabus'),
      ]);

      setSubjects(
        subjectsResponse.subjects ||
          subjectsResponse.data ||
          []
      );

      setSyllabi(
        syllabusResponse.syllabi ||
          syllabusResponse.data ||
          []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function toggleTopic(topicId) {
    try {
      const response = await apiRequest(
        `/syllabus/topics/${topicId}/toggle`,
        {
          method: 'PATCH',
        }
      );

      const updatedTopic = response.topic || response.data;

      setSyllabi((current) =>
        current.map((syllabus) => ({
          ...syllabus,
          units: (syllabus.units || []).map((unit) => ({
            ...unit,
            topics: (unit.topics || []).map((topic) =>
              topic._id === updatedTopic._id
                ? updatedTopic
                : topic
            ),
          })),
        }))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleSyllabi = useMemo(() => {
    if (selectedSubject === 'all') {
      return syllabi;
    }

    return syllabi.filter(
      (syllabus) =>
        syllabus.subject?._id === selectedSubject ||
        syllabus.subject === selectedSubject ||
        syllabus.subjectId === selectedSubject
    );
  }, [syllabi, selectedSubject]);

  function calculateProgress(syllabus) {
    const topics = (syllabus.units || []).flatMap(
      (unit) => unit.topics || []
    );

    if (!topics.length) return 0;

    const completed = topics.filter(
      (topic) => topic.completed
    ).length;

    return Math.round((completed / topics.length) * 100);
  }

  return (
    <Shell>
      <PageHeading
        eyebrow="Structure"
        title="Syllabus"
        detail="Turn your course syllabus into a trackable study plan."
      />

      <div className="mt-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3">
            <select
              value={selectedSubject}
              onChange={(event) =>
                setSelectedSubject(event.target.value)
              }
              className="h-11 min-w-0 flex-1 rounded-xl border border-card-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary sm:max-w-xs"
            >
              <option value="all">All subjects</option>

              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowUpload(true)}
            className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition hover:opacity-90"
          >
            + Upload syllabus
          </button>
        </div>

        {loading && (
          <div className="rounded-2xl border border-card-border bg-card p-10 text-center text-muted-foreground">
            Loading your syllabus...
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-400">
            {error}

            <button
              type="button"
              onClick={loadData}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && visibleSyllabi.length === 0 && (
          <div className="rounded-3xl border border-dashed border-card-border bg-card p-12 text-center">
            <div className="text-5xl">📚</div>

            <h2 className="mt-4 text-2xl font-semibold text-foreground">
              No syllabus yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Upload a subject syllabus PDF and StudyArena will extract
              its units and topics so you can track what you have completed.
            </p>

            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="mt-6 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground"
            >
              Upload your first syllabus
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          visibleSyllabi.map((syllabus) => {
            const progress = calculateProgress(syllabus);

            return (
              <section
                key={syllabus._id}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-card-border bg-card p-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Subject
                      </p>

                      <h2 className="mt-1 text-2xl font-semibold text-foreground">
                        {syllabus.subject?.name ||
                          syllabus.subjectName ||
                          'Subject'}
                      </h2>

                      {syllabus.fileName && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {syllabus.fileName}
                        </p>
                      )}
                    </div>

                    <div className="w-full sm:w-56">
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Overall progress
                        </span>

                        <strong className="text-foreground">
                          {progress}%
                        </strong>
                      </div>

                      <ProgressBar value={progress} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {(syllabus.units || []).map((unit) => (
                    <UnitCard
                      key={unit._id}
                      unit={unit}
                      onToggleTopic={toggleTopic}
                    />
                  ))}
                </div>
              </section>
            );
          })}
      </div>

      {showUpload && (
        <UploadModal
          subjects={subjects}
          onClose={() => setShowUpload(false)}
          onUploaded={(newSyllabus) => {
            setSyllabi((current) => [
              newSyllabus,
              ...current,
            ]);

            setShowUpload(false);
          }}
        />
      )}
    </Shell>
  );
}
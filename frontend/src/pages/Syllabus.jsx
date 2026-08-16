import { useState, useEffect, useMemo } from "react";
import { BookOpen, CheckCircle, Circle, Play, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import Shell from "../components/Shell.jsx";
import {
  PageHeading,
  Button,
  LoadingBlock,
  QueryState,
  cx,
} from "../components/shared.jsx";
import SyllabusReviewModal from "../components/subjects/SyllabusReviewModal.jsx";
import { uploadFile } from "../services/apiHooks.js";

function UploadModal({ subjects, onClose, onUploaded }) {
  const [subjectId, setSubjectId] = useState("");
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function selectFile(selectedFile) {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      setError("Please upload a PDF syllabus.");
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError("The syllabus PDF must be smaller than 15 MB.");
      return;
    }
    setError("");
    setFile(selectedFile);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!subjectId) return setError("Please select a subject.");
    if (!file) return setError("Please select a syllabus PDF.");

    try {
      setUploading(true);
      setError("");

      const fileData = await uploadFile(file);
      await apiClient.patch(`/subjects/${subjectId}`, {
        syllabusFile: fileData,
      });

      onUploaded(subjectId, fileData);
    } catch (err) {
      setError(err.message || "Upload failed");
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
            className="rounded-full px-3 py-2 text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
          <label className="mb-2 block text-sm font-medium">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mb-6 h-12 w-full rounded-xl border border-card-border bg-background px-4 outline-none focus:border-primary"
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          <label
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              selectFile(e.dataTransfer.files?.[0]);
            }}
            className={cx(
              "flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition",
              dragging
                ? "border-primary bg-primary/5"
                : "border-card-border hover:border-primary/50",
            )}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0])}
            />
            <div className="mb-3 text-4xl">📄</div>
            {file ? (
              <>
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Drop your syllabus PDF here</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or click to browse (Max 15MB)
                </p>
              </>
            )}
          </label>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-card-border px-5 py-3 font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-60"
            >
              {uploading ? "Uploading..." : "Upload & Proceed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Syllabus() {
  const [subjects, setSubjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [extracting, setExtracting] = useState(false);
  const [parsedSyllabusData, setParsedSyllabusData] = useState(null);
  const [extractTargetSubject, setExtractTargetSubject] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjRes, unitsRes, topicsRes] = await Promise.all([
        apiClient.get("/subjects"),
        apiClient.get("/units"),
        apiClient.get("/topics"),
      ]);
      setSubjects(subjRes.data.data);
      setUnits(unitsRes.data.data);
      setTopics(topicsRes.data.data);
    } catch (err) {
      setError("Failed to load syllabus data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleTopic = async (topic) => {
    try {
      const newStatus =
        topic.status === "completed" ? "not-started" : "completed";
      await apiClient.patch(`/topics/${topic._id}`, { status: newStatus });
      setTopics(
        topics.map((t) =>
          t._id === topic._id ? { ...t, status: newStatus } : t,
        ),
      );
    } catch (err) {
      // ignore
    }
  };

  const handleExtract = async (subjectId) => {
    setExtracting(true);
    setExtractTargetSubject(subjectId);
    try {
      const res = await apiClient.post(
        `/subjects/${subjectId}/syllabus/extract`,
      );
      setParsedSyllabusData(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to extract syllabus text.");
    } finally {
      setExtracting(false);
    }
  };

  const displayedSubjects = useMemo(() => {
    if (selectedSubject === "all") return subjects;
    return subjects.filter((s) => s._id === selectedSubject);
  }, [subjects, selectedSubject]);

  if (loading)
    return (
      <Shell>
        <LoadingBlock lines={8} />
      </Shell>
    );
  if (error)
    return (
      <Shell>
        <QueryState error={error} onRetry={loadData} label="Syllabus" />
      </Shell>
    );

  return (
    <Shell>
      <PageHeading
        eyebrow="Structure"
        title="Syllabus"
        detail="Turn your course syllabus into a trackable study plan."
      />

      <div className="mt-6 space-y-6 mb-8">
        <div className="flex flex-col gap-3 rounded-2xl border border-card-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 gap-3">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-card-border bg-background px-4 text-sm outline-none focus:border-primary sm:max-w-xs"
            >
              <option value="all">All subjects</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => setShowUpload(true)}>Upload Syllabus</Button>
        </div>
      </div>

      <div className="space-y-12">
        {displayedSubjects.map((subject) => {
          const subjectUnits = units.filter((u) => u.subject === subject._id);
          const subjectTopics = topics.filter((t) => t.subject === subject._id);
          const compTopics = subjectTopics.filter(
            (t) => t.status === "completed",
          ).length;
          const prog = subjectTopics.length
            ? Math.round((compTopics / subjectTopics.length) * 100)
            : 0;

          return (
            <div key={subject._id} className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl">{subject.name}</h2>
                  <p className="text-sm text-muted-foreground uppercase tracking-widest font-mono mt-1">
                    {subject.code} · {subject.credits} Credits
                  </p>
                </div>
                {subjectUnits.length > 0 && (
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                        Overall Progress
                      </p>
                      <p className="font-display text-xl">{prog}%</p>
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-accent transition-all duration-500"
                        style={{ width: `${prog}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {!subject.syllabusFile?.url && subjectUnits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-card/50">
                  <p className="text-muted-foreground text-sm">
                    No syllabus uploaded yet.
                  </p>
                </div>
              ) : subject.syllabusFile?.url && subjectUnits.length === 0 ? (
                <div className="rounded-2xl border border-border p-6 bg-card flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">
                      Syllabus PDF attached
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ready for extraction.
                    </p>
                  </div>
                  <Button
                    disabled={extracting}
                    onClick={() => handleExtract(subject._id)}
                  >
                    {extracting && extractTargetSubject === subject._id ? (
                      "Extracting..."
                    ) : (
                      <>
                        <Wand2 size={16} className="mr-2" /> Auto-Extract from
                        PDF
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {subjectUnits.map((unit, idx) => {
                    const uTopics = subjectTopics
                      .filter((t) => t.unit === unit._id)
                      .sort((a, b) => a.order - b.order);
                    const completedCount = uTopics.filter(
                      (t) => t.status === "completed",
                    ).length;
                    return (
                      <div
                        key={unit._id}
                        className="rounded-xl border border-card-border bg-card overflow-hidden flex flex-col shadow-sm"
                      >
                        <div className="p-5 border-b border-border/50 bg-secondary/30">
                          <h3 className="font-display text-lg mb-1">
                            {unit.title}
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-border">
                              <div
                                className="h-full bg-accent transition-all duration-500"
                                style={{
                                  width: `${uTopics.length ? (completedCount / uTopics.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {completedCount}/{uTopics.length}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 flex-1 overflow-y-auto">
                          {uTopics.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-4 text-center">
                              No topics
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {uTopics.map((topic) => (
                                <div
                                  key={topic._id}
                                  className="flex items-start justify-between rounded-lg p-2 hover:bg-background group transition-colors"
                                >
                                  <button
                                    onClick={() => toggleTopic(topic)}
                                    className="flex items-start gap-3 text-left mt-0.5"
                                  >
                                    {topic.status === "completed" ? (
                                      <CheckCircle
                                        size={16}
                                        className="text-accent shrink-0 mt-0.5"
                                      />
                                    ) : (
                                      <Circle
                                        size={16}
                                        className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                                      />
                                    )}
                                    <span
                                      className={cx(
                                        "text-sm transition-all leading-tight",
                                        topic.status === "completed" &&
                                          "text-muted-foreground line-through opacity-70",
                                      )}
                                    >
                                      {topic.name || topic.title}
                                    </span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showUpload && (
        <UploadModal
          subjects={subjects}
          onClose={() => setShowUpload(false)}
          onUploaded={(subjId) => {
            setShowUpload(false);
            loadData();
            handleExtract(subjId);
          }}
        />
      )}
      {parsedSyllabusData && extractTargetSubject && (
        <SyllabusReviewModal
          subjectId={extractTargetSubject}
          parsedData={parsedSyllabusData}
          onClose={() => {
            setParsedSyllabusData(null);
            setExtractTargetSubject(null);
          }}
          onSuccess={loadData}
        />
      )}
    </Shell>
  );
}

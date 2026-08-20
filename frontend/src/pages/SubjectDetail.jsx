import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle,
  Circle,
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronRight,
  Play,
  Wand2,
} from "lucide-react";
import apiClient from "../services/apiClient.js";
import {
  useCreateUnit,
  useCreateTopic,
  useCreateImportantPoint,
} from "../services/apiHooks.js";
import Shell from "../components/Shell.jsx";
import {
  PageHeading,
  Button,
  LoadingBlock,
  QueryState,
  cx,
  Modal,
  Field,
  inputClass,
} from "../components/shared.jsx";
import SyllabusReviewModal from "../components/subjects/SyllabusReviewModal.jsx";

function UnitForm({ subjectId, onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const create = useCreateUnit();

  const submit = (e) => {
    e.preventDefault();
    create.mutate(
      { data: { subjectId, title } },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      },
    );
  };

  return (
    <form id="unit-form" onSubmit={submit} className="flex h-full flex-col">
      <Modal
        title="Add a Unit"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="unit-form" disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Add Unit"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Unit Title">
            <input
              required
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter unit name"
            />
          </Field>
        </div>
      </Modal>
    </form>
  );
}

function TopicForm({ subjectId, unitId, onClose, onSuccess }) {
  const [name, setName] = useState("");
  const create = useCreateTopic();

  const submit = (e) => {
    e.preventDefault();
    create.mutate(
      { data: { subjectId, unit: unitId, name, completed: false } },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      },
    );
  };

  return (
    <form id="topic-form" onSubmit={submit} className="flex h-full flex-col">
      <Modal
        title="Add a Topic"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="topic-form" disabled={create.isPending}>
              {create.isPending ? "Saving..." : "Add Topic"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Topic Name">
            <input
              required
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter topic name"
            />
          </Field>
        </div>
      </Modal>
    </form>
  );
}

function ImportantPointForm({ subjectId, onClose, onSuccess }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const create = useCreateImportantPoint();

  const submit = (e) => {
    e.preventDefault();
    create.mutate(
      { data: { subjectId, title, content } },
      {
        onSuccess: () => {
          onSuccess();
          onClose();
        },
      },
    );
  };

  return (
    <form
      id="important-point-form"
      onSubmit={submit}
      className="flex h-full flex-col"
    >
      <Modal
        title="Save a Key Point"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="important-point-form"
              disabled={create.isPending}
            >
              {create.isPending ? "Saving..." : "Save Point"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <input
              required
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a short description"
            />
          </Field>
          <Field label="Content">
            <textarea
              required
              className={cx(inputClass, "min-h-25 resize-y")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add description"
            />
          </Field>
        </div>
      </Modal>
    </form>
  );
}

export default function SubjectDetail() {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [importantPoints, setImportantPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("overview"); // overview | syllabus

  const [expandedUnits, setExpandedUnits] = useState({});
  const [openUnitForm, setOpenUnitForm] = useState(false);
  const [openTopicFormForUnit, setOpenTopicFormForUnit] = useState(null);
  const [openPointForm, setOpenPointForm] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const [parsedSyllabusData, setParsedSyllabusData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjRes, unitsRes, topicsRes, ipRes] = await Promise.all([
        apiClient.get(`/subjects/${id}`),
        apiClient.get(`/units?subjectId=${id}`),
        apiClient.get(`/topics?subjectId=${id}`),
        apiClient.get(`/important-points?subjectId=${id}`),
      ]);
      setSubject(subjRes.data.data);
      setUnits(unitsRes.data.data);
      setTopics(topicsRes.data.data);
      setImportantPoints(ipRes.data.data);

      // Auto expand first unit
      if (unitsRes.data.data.length > 0) {
        setExpandedUnits({ [unitsRes.data.data[0]._id]: true });
      }
    } catch (err) {
      setError("Could not load subject details");
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

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

  const extractSyllabusFromPDF = async () => {
    if (!subject.syllabusFile?.url) return;
    setExtracting(true);
    try {
      const res = await apiClient.post(
        `/subjects/${subject._id}/syllabus/extract`,
      );
      setParsedSyllabusData(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to extract syllabus text.");
    } finally {
      setExtracting(false);
    }
  };

  if (loading)
    return (
      <Shell>
        <LoadingBlock lines={8} />
      </Shell>
    );
  if (error || !subject)
    return (
      <Shell>
        <QueryState error={error} onRetry={fetchData} label="Subject" />
      </Shell>
    );

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.status === "completed").length;
  const progressPercent =
    totalTopics === 0 ? 0 : Math.round((completedTopics / totalTopics) * 100);

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/subjects"
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft size={18} />
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Back to Subjects
        </span>
      </div>

      <PageHeading
        eyebrow={`${subject.code} · ${subject.credits} Credits`}
        title={subject.name}
        detail={subject.description || "No description provided."}
      />

      {/* TABS */}
      <div className="mb-8 flex space-x-1 rounded-xl bg-muted/50 p-1 w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={cx(
            "rounded-lg px-6 py-2 text-sm font-semibold transition-all",
            activeTab === "overview"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50",
          )}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("syllabus")}
          className={cx(
            "rounded-lg px-6 py-2 text-sm font-semibold transition-all",
            activeTab === "syllabus"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50",
          )}
        >
          Syllabus & Units
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {activeTab === "overview" ? (
          <>
            <div className="lg:col-span-2 space-y-6">
              <section className="rounded-2xl border border-card-border bg-card p-6">
                <h3 className="font-display text-xl mb-4">Progress Overview</h3>
                <div className="flex items-center gap-6">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                    <svg
                      className="absolute inset-0 h-full w-full -rotate-90 transform"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-border"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${progressPercent * 2.83} 283`}
                        className="text-accent transition-all duration-1000"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="font-display text-xl">
                      {progressPercent}%
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {completedTopics} of {totalTopics} Topics Completed
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Keep up the momentum! You've got this.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 h-8"
                      onClick={() => setActiveTab("syllabus")}
                    >
                      View Syllabus
                    </Button>
                  </div>
                </div>
              </section>

              {subject.syllabusFile?.url && (
                <section className="rounded-2xl border border-card-border bg-card p-6">
                  <h3 className="font-display text-xl mb-3">
                    Attached Syllabus
                  </h3>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary text-primary rounded-lg">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {subject.syllabusFile.originalName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF Document
                        </p>
                      </div>
                    </div>
                    <a
                      href={subject.syllabusFile.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" className="h-8">
                        View PDF
                      </Button>
                    </a>
                  </div>
                </section>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl text-accent">
                    Important Points
                  </h3>
                  <button
                    onClick={() => setOpenPointForm(true)}
                    className="rounded p-1 hover:bg-accent/20 text-accent transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {importantPoints.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No points saved yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {importantPoints.map((point) => (
                      <div
                        key={point._id}
                        className="rounded-lg bg-card border border-accent/10 p-3 shadow-sm"
                      >
                        <h4 className="text-sm font-semibold">{point.title}</h4>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {point.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl p-4">
              <h2 className="font-display text-2xl ml-2">Units & Topics</h2>
              <div className="flex gap-3">
                {subject.syllabusFile?.url && units.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={extractSyllabusFromPDF}
                    disabled={extracting}
                  >
                    {extracting ? (
                      "Extracting..."
                    ) : (
                      <>
                        <Wand2 size={16} className="mr-2" /> Auto-Extract from
                        PDF
                      </>
                    )}
                  </Button>
                )}
                <Button variant="default" onClick={() => setOpenUnitForm(true)}>
                  <Plus size={16} className="mr-2" /> Add Unit
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {units.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  <BookOpen size={32} className="mx-auto mb-4 opacity-50" />
                  <p className="text-base font-semibold mb-2">
                    No units defined
                  </p>
                  <p className="text-sm max-w-md mx-auto">
                    Break down your subject into manageable units and topics.
                    You can manually add them or auto-extract from your syllabus
                    PDF.
                  </p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {units.map((unit, idx) => {
                    const unitTopics = topics.filter(
                      (t) => t.unit === unit._id,
                    );
                    const completedCount = unitTopics.filter(
                      (t) => t.status === "completed",
                    ).length;

                    return (
                      <div
                        key={unit._id}
                        className="rounded-xl border border-card-border bg-card overflow-hidden flex flex-col shadow-sm"
                      >
                        <div className="p-5 border-b border-border/50 bg-secondary/30">
                          <h3 className="font-display text-lg mb-1">
                            Unit {idx + 1}: {unit.title}
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-border">
                              <div
                                className="h-full bg-accent transition-all duration-500"
                                style={{
                                  width: `${unitTopics.length ? (completedCount / unitTopics.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {completedCount}/{unitTopics.length}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 flex-1 overflow-y-auto">
                          {unitTopics.length === 0 ? (
                            <p className="p-4 text-xs text-muted-foreground text-center">
                              No topics in this unit.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {unitTopics.map((topic) => (
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
                                      {topic.name}
                                    </span>
                                  </button>
                                  <Link
                                    to={`/study-session?subject=${subject._id}&topic=${topic._id}`}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                    title="Start Focus Session"
                                  >
                                    <Play size={14} />
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="p-3 border-t border-border/50 bg-background/50">
                          <button
                            onClick={() => setOpenTopicFormForUnit(unit._id)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                          >
                            <Plus size={14} /> Add topic
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {openUnitForm && (
        <UnitForm
          subjectId={id}
          onClose={() => setOpenUnitForm(false)}
          onSuccess={fetchData}
        />
      )}
      {openTopicFormForUnit && (
        <TopicForm
          subjectId={id}
          unitId={openTopicFormForUnit}
          onClose={() => setOpenTopicFormForUnit(null)}
          onSuccess={fetchData}
        />
      )}
      {openPointForm && (
        <ImportantPointForm
          subjectId={id}
          onClose={() => setOpenPointForm(false)}
          onSuccess={fetchData}
        />
      )}

      {parsedSyllabusData && (
        <SyllabusReviewModal
          subjectId={id}
          parsedData={parsedSyllabusData}
          onClose={() => setParsedSyllabusData(null)}
          onSuccess={fetchData}
        />
      )}
    </Shell>
  );
}

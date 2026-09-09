import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Folder,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import apiClient from '../../services/apiClient';

export default function ExamSyllabusPicker({
  selectedTopicIds = [],
  onChangeSelectedTopics,
  subjects = [],
  primarySubjectId,
}) {
  const [subjectData, setSubjectData] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('all');

  // Load units & topics for subjects
  useEffect(() => {
    subjects.forEach((sub) => {
      const sId = sub.id || sub._id;
      if (sId && !subjectData[sId] && !loadingMap[sId]) {
        setLoadingMap((prev) => ({ ...prev, [sId]: true }));
        Promise.all([
          apiClient.get(`/units?subjectId=${sId}`).then((r) => r.data?.data || r.data || []).catch(() => []),
          apiClient.get(`/topics?subjectId=${sId}`).then((r) => r.data?.data || r.data || []).catch(() => []),
        ])
          .then(([units, topics]) => {
            setSubjectData((prev) => ({
              ...prev,
              [sId]: { units, topics },
            }));
            // Auto expand if only 1 subject
            if (subjects.length === 1) {
              setExpandedSubjects({ [sId]: true });
            }
          })
          .finally(() => {
            setLoadingMap((prev) => ({ ...prev, [sId]: false }));
          });
      }
    });
  }, [subjects]);

  // If primarySubjectId is provided, expand that subject by default
  useEffect(() => {
    if (primarySubjectId) {
      setExpandedSubjects((prev) => ({ ...prev, [primarySubjectId]: true }));
    }
  }, [primarySubjectId]);

  // Selected topics Set for quick lookup
  const selectedSet = useMemo(() => new Set(selectedTopicIds), [selectedTopicIds]);

  // Compute overall stats for selected topics
  const { totalSelected, completedSelected, pendingSelected } = useMemo(() => {
    let comp = 0;
    let pend = 0;
    const allTopics = Object.values(subjectData).flatMap((d) => d.topics || []);
    selectedSet.forEach((tid) => {
      const t = allTopics.find((top) => (top._id || top.id) === tid);
      if (t) {
        if (t.completed || t.status === 'completed') {
          comp += 1;
        } else {
          pend += 1;
        }
      }
    });
    return {
      totalSelected: selectedSet.size,
      completedSelected: comp,
      pendingSelected: pend,
    };
  }, [selectedSet, subjectData]);

  const toggleTopic = (topicId) => {
    const next = new Set(selectedSet);
    if (next.has(topicId)) {
      next.delete(topicId);
    } else {
      next.add(topicId);
    }
    emitChange(Array.from(next));
  };

  const toggleUnit = (unitId, unitTopics) => {
    const next = new Set(selectedSet);
    const unitTopicIds = unitTopics.map((t) => t._id || t.id);
    const allUnitSelected = unitTopicIds.length > 0 && unitTopicIds.every((id) => next.has(id));

    if (allUnitSelected) {
      unitTopicIds.forEach((id) => next.delete(id));
    } else {
      unitTopicIds.forEach((id) => next.add(id));
    }
    emitChange(Array.from(next));
  };

  const toggleSubject = (subjectId, subjectTopics) => {
    const next = new Set(selectedSet);
    const subTopicIds = subjectTopics.map((t) => t._id || t.id);
    const allSubSelected = subTopicIds.length > 0 && subTopicIds.every((id) => next.has(id));

    if (allSubSelected) {
      subTopicIds.forEach((id) => next.delete(id));
    } else {
      subTopicIds.forEach((id) => next.add(id));
    }
    emitChange(Array.from(next));
  };

  const emitChange = (newTopicIds) => {
    const allTopics = Object.values(subjectData).flatMap((d) => d.topics || []);
    const selectedDocs = allTopics.filter((t) => newTopicIds.includes(t._id || t.id));

    const syllabus = selectedDocs.map((t) => ({
      subjectId: t.subject?._id || t.subject?.id || t.subject,
      unitId: t.unit?._id || t.unit?.id || t.unit || null,
      topicId: t._id || t.id,
    }));

    const primarySubId = selectedDocs.length > 0 ? (selectedDocs[0].subject?._id || selectedDocs[0].subject) : (primarySubjectId || subjects[0]?.id || subjects[0]?._id);

    if (onChangeSelectedTopics) {
      onChangeSelectedTopics(newTopicIds, syllabus, primarySubId);
    }
  };

  const filteredSubjects = useMemo(() => {
    if (activeSubjectFilter === 'all') return subjects;
    return subjects.filter((s) => (s.id || s._id) === activeSubjectFilter);
  }, [subjects, activeSubjectFilter]);

  return (
    <div className="space-y-4">
      {/* Syllabus Selection Summary Banner */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Exam Syllabus Scope
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-accent">
            {totalSelected} topic{totalSelected === 1 ? '' : 's'} included
          </span>
        </div>

        {totalSelected > 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 pt-1">
            <div className="rounded-lg bg-background border border-border/80 p-2.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Selected</span>
              <span className="font-mono text-base font-bold text-foreground">{totalSelected}</span>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check size={11} /> Already Done
              </span>
              <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                {completedSelected} ({Math.round((completedSelected / totalSelected) * 100)}%)
              </span>
            </div>
            <div className="rounded-lg bg-background border border-border/80 p-2.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Clock size={11} /> Pending
              </span>
              <span className="font-mono text-base font-bold text-foreground">{pendingSelected}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Select units and topics from your imported syllabus below to include in this exam.
          </p>
        )}
      </div>

      {/* Subject Filter Tabs if multiple subjects */}
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-border/70 pb-2">
          <button
            type="button"
            onClick={() => setActiveSubjectFilter('all')}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
              activeSubjectFilter === 'all'
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            All Subjects ({subjects.length})
          </button>
          {subjects.map((sub) => {
            const sId = sub.id || sub._id;
            return (
              <button
                key={sId}
                type="button"
                onClick={() => setActiveSubjectFilter(sId)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  activeSubjectFilter === sId
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Subjects Tree List */}
      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        {filteredSubjects.map((sub) => {
          const sId = sub.id || sub._id;
          const sData = subjectData[sId] || { units: [], topics: [] };
          const units = sData.units || [];
          const topics = sData.topics || [];
          const isExpanded = Boolean(expandedSubjects[sId]);
          const isLoading = Boolean(loadingMap[sId]);

          const subTopicIds = topics.map((t) => t._id || t.id);
          const allSubSelected = subTopicIds.length > 0 && subTopicIds.every((id) => selectedSet.has(id));
          const someSubSelected = subTopicIds.some((id) => selectedSet.has(id)) && !allSubSelected;
          const selectedSubCount = subTopicIds.filter((id) => selectedSet.has(id)).length;

          return (
            <div
              key={sId}
              className="rounded-xl border border-border bg-card overflow-hidden transition-all shadow-sm"
            >
              {/* Subject Header */}
              <div className="flex items-center justify-between gap-3 p-3 bg-muted/30 border-b border-border/50">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSubjects((prev) => ({ ...prev, [sId]: !prev[sId] }))
                    }
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  <label className="flex items-center gap-2 cursor-pointer select-none min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={allSubSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSubSelected;
                      }}
                      onChange={() => toggleSubject(sId, topics)}
                      disabled={topics.length === 0}
                      className="h-4 w-4 rounded border-input text-accent focus:ring-accent"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <BookOpen size={14} className="text-accent shrink-0" />
                        <span className="font-semibold text-xs text-foreground truncate">
                          {sub.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        {sub.code || ''} · {topics.length} topics
                        {selectedSubCount > 0 ? ` (${selectedSubCount} selected)` : ''}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSubject(sId, topics)}
                    disabled={topics.length === 0}
                    className="text-[10px] font-bold text-accent hover:underline px-2 py-0.5"
                  >
                    {allSubSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Subject Units / Topics List */}
              {isExpanded && (
                <div className="p-3 space-y-3 bg-background/50">
                  {isLoading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Loading syllabus topics…
                    </div>
                  ) : topics.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No extracted syllabus found for this subject yet. You can extract it from the Syllabus tab.
                    </div>
                  ) : units.length > 0 ? (
                    units.map((unit, uIdx) => {
                      const uId = unit._id || unit.id || `unit_${uIdx}`;
                      const unitKey = `${sId}_${uId}`;
                      const isUnitExpanded = expandedUnits[unitKey] !== false;
                      const unitTopics = topics.filter((t) => {
                        const tUnit = t.unit?._id || t.unit?.id || t.unit;
                        return tUnit && tUnit.toString() === uId.toString();
                      });

                      const unitTopicIds = unitTopics.map((t) => t._id || t.id);
                      const allUnitSelected = unitTopicIds.length > 0 && unitTopicIds.every((id) => selectedSet.has(id));
                      const someUnitSelected = unitTopicIds.some((id) => selectedSet.has(id)) && !allUnitSelected;
                      const selUnitCount = unitTopicIds.filter((id) => selectedSet.has(id)).length;

                      return (
                        <div
                          key={uId}
                          className="rounded-lg border border-border/70 bg-card overflow-hidden"
                        >
                          {/* Unit Header */}
                          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 border-b border-border/40">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedUnits((prev) => ({
                                    ...prev,
                                    [unitKey]: !isUnitExpanded,
                                  }))
                                }
                                className="p-0.5 text-muted-foreground hover:text-foreground"
                              >
                                {isUnitExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>

                              <label className="flex items-center gap-2 cursor-pointer select-none min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={allUnitSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someUnitSelected;
                                  }}
                                  onChange={() => toggleUnit(uId, unitTopics)}
                                  disabled={unitTopics.length === 0}
                                  className="h-3.5 w-3.5 rounded border-input text-accent focus:ring-accent"
                                />
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Folder size={13} className="text-muted-foreground shrink-0" />
                                  <span className="text-xs font-semibold text-foreground truncate">
                                    {unit.title || `Unit ${uIdx + 1}`}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    ({selUnitCount}/{unitTopics.length})
                                  </span>
                                </div>
                              </label>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleUnit(uId, unitTopics)}
                              disabled={unitTopics.length === 0}
                              className="text-[10px] font-semibold text-muted-foreground hover:text-foreground px-1.5"
                            >
                              {allUnitSelected ? 'Clear' : 'Select'}
                            </button>
                          </div>

                          {/* Unit Topics */}
                          {isUnitExpanded && (
                            <div className="p-2.5 space-y-1.5">
                              {unitTopics.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground italic px-2 py-1">
                                  No topics listed in this unit.
                                </p>
                              ) : (
                                unitTopics.map((topic) => {
                                  const tId = topic._id || topic.id;
                                  const isSelected = selectedSet.has(tId);
                                  const isCompleted = topic.completed || topic.status === 'completed';

                                  return (
                                    <label
                                      key={tId}
                                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                        isSelected
                                          ? 'border-accent/40 bg-accent/5'
                                          : 'border-transparent hover:bg-muted/40'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleTopic(tId)}
                                          className="h-3.5 w-3.5 rounded border-input text-accent focus:ring-accent"
                                        />
                                        <span className="text-xs text-foreground truncate">
                                          {topic.title}
                                        </span>
                                      </div>

                                      {isCompleted ? (
                                        <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                          <CheckCircle2 size={10} /> Completed
                                        </span>
                                      ) : (
                                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                                          Pending
                                        </span>
                                      )}
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    /* Fallback: Flat topics list if no units defined */
                    <div className="space-y-1.5">
                      {topics.map((topic) => {
                        const tId = topic._id || topic.id;
                        const isSelected = selectedSet.has(tId);
                        const isCompleted = topic.completed || topic.status === 'completed';

                        return (
                          <label
                            key={tId}
                            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-accent/40 bg-accent/5'
                                : 'border-border/60 hover:bg-muted/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTopic(tId)}
                                className="h-3.5 w-3.5 rounded border-input text-accent focus:ring-accent"
                              />
                              <span className="text-xs text-foreground truncate">{topic.title}</span>
                            </div>

                            {isCompleted ? (
                              <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={10} /> Completed
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                                Pending
                              </span>
                            )}
                          </label>
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
    </div>
  );
}

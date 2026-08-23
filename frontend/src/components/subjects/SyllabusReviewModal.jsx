import { useState } from 'react';
import { Button, Modal, Field, inputClass, cx } from '../shared.jsx';
import apiClient from '../../services/apiClient.js';
import { Trash2, Plus, GripVertical, BookOpen, FlaskConical } from 'lucide-react';

export default function SyllabusReviewModal({ subjectId, parsedData, onClose, onSuccess }) {
  // Normalize units from backend format: { unitNumber, unitName, title, topics: [{ title, name, confidence }] }
  const normalizedUnits = (parsedData?.units || []).map((u, i) => ({
    name: u.unitName || u.name || u.title || `Unit ${u.unitNumber || i + 1}`,
    isLab: u.unitName?.toLowerCase().includes('laboratory') || u.name?.toLowerCase().includes('laboratory') || false,
    topics: (u.topics || []).map(t => ({
      name: typeof t === 'string' ? t : (t.title || t.name || ''),
      confidence: t.confidence || 'high'
    }))
  }));

  const [units, setUnits] = useState(normalizedUnits);
  const [saving, setSaving] = useState(false);

  const handleUnitChange = (uIdx, val) => {
    const next = [...units];
    next[uIdx].name = val;
    setUnits(next);
  };

  const handleTopicChange = (uIdx, tIdx, val) => {
    const next = [...units];
    next[uIdx].topics[tIdx].name = val;
    setUnits(next);
  };

  const addUnit = () => {
    setUnits(prev => [...prev, { name: `Unit ${prev.length + 1}`, isLab: false, topics: [] }]);
  };

  const addTopic = (uIdx) => {
    const next = [...units];
    const isLab = next[uIdx].isLab;
    next[uIdx].topics.push({ name: isLab ? 'New Experiment' : 'New Topic', confidence: 'manual' });
    setUnits(next);
  };

  const removeUnit = (uIdx) => {
    setUnits(units.filter((_, i) => i !== uIdx));
  };

  const removeTopic = (uIdx, tIdx) => {
    const next = [...units];
    next[uIdx].topics = next[uIdx].topics.filter((_, i) => i !== tIdx);
    setUnits(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Backend expects { units: [{ name, topics: [{ name }] }] }
      const payloadUnits = units.map(u => ({
        name: u.name,
        topics: u.topics.map(t => ({ name: t.name.trim() })).filter(t => t.name)
      })).filter(u => u.name.trim());

      await apiClient.post(`/subjects/${subjectId}/syllabus/confirm`, { units: payloadUnits });
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save syllabus structure.');
    } finally {
      setSaving(false);
    }
  };

  const totalTopics = units.reduce((acc, u) => acc + u.topics.length, 0);

  // Compute smart eyebrow summary for Theory + Lab vs Theory-only vs Lab-only
  const theoryUnitsList = units.filter(u => !u.isLab);
  const labUnitsList = units.filter(u => u.isLab);
  const labExperimentsCount = labUnitsList.reduce((acc, u) => acc + u.topics.length, 0);

  let eyebrowText = `Extracted ${units.length} units and ${totalTopics} topics`;
  if (theoryUnitsList.length > 0 && labUnitsList.length > 0) {
    eyebrowText = `Extracted ${theoryUnitsList.length} theory units and ${labExperimentsCount} lab experiments`;
  } else if (theoryUnitsList.length > 0 && labUnitsList.length === 0) {
    eyebrowText = `Extracted ${theoryUnitsList.length} theory units and ${totalTopics} topics`;
  } else if (theoryUnitsList.length === 0 && labUnitsList.length > 0) {
    eyebrowText = `Extracted ${labExperimentsCount} lab experiments`;
  }

  return (
    <Modal
      title="Review Extracted Syllabus"
      eyebrow={eyebrowText}
      onClose={onClose}
      footer={
        <div className="flex justify-between w-full items-center">
          <Button type="button" variant="quiet" onClick={addUnit} className="gap-1.5 text-xs">
            <Plus size={14} /> Add Unit
          </Button>
          <div className="flex gap-3">
            <Button variant="quiet" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving || units.length === 0}>
              {saving ? 'Saving…' : 'Confirm & Save Syllabus'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
        {units.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <p className="text-sm font-semibold">No units extracted</p>
            <p className="mt-1 text-xs">Click "Add Unit" below to structure your syllabus manually.</p>
          </div>
        ) : (
          units.map((unit, uIdx) => {
            const isFirstLabUnit = unit.isLab && (uIdx === 0 || !units[uIdx - 1].isLab);
            const isFirstTheoryUnit = !unit.isLab && uIdx === 0 && labUnitsList.length > 0;

            return (
              <div key={uIdx} className="space-y-3">
                {isFirstTheoryUnit && (
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground pt-1">
                    <BookOpen size={14} className="text-primary" />
                    Theory Units ({theoryUnitsList.length})
                  </div>
                )}
                {isFirstLabUnit && theoryUnitsList.length > 0 && (
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary pt-3 border-t border-border/60">
                    <FlaskConical size={14} />
                    Laboratory Section ({labExperimentsCount} Experiments)
                  </div>
                )}
                <div className={cx(
                  'rounded-2xl border border-border p-4 bg-card/60 shadow-sm transition-all',
                  unit.isLab && 'border-primary/30 bg-primary/[0.02]'
                )}>
                  <div className="flex items-center gap-3 mb-3">
                    <GripVertical size={16} className="text-muted-foreground/40 shrink-0" />
                    <input
                      className={cx(inputClass, 'font-semibold text-base flex-1', unit.isLab && 'text-primary')}
                      value={unit.name}
                      onChange={(e) => handleUnitChange(uIdx, e.target.value)}
                      placeholder={unit.isLab ? 'Laboratory section title' : 'Unit title'}
                    />
                    <Button
                      type="button"
                      variant="quiet"
                      onClick={() => addTopic(uIdx)}
                      className="h-8 gap-1 px-2.5 text-xs shrink-0"
                      title={unit.isLab ? 'Add Experiment' : 'Add Topic'}
                    >
                      <Plus size={13} /> {unit.isLab ? 'Experiment' : 'Topic'}
                    </Button>
                    <button
                      onClick={() => removeUnit(uIdx)}
                      className="p-2 text-destructive/70 hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                      title="Delete unit"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>

                  <div className="ml-7 space-y-2 border-l-2 border-border/60 pl-4">
                    {unit.topics.map((topic, tIdx) => (
                      <div key={tIdx} className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs font-mono w-5 shrink-0 text-right">{tIdx + 1}.</span>
                        <input
                          className={cx(inputClass, 'h-9 text-sm flex-1')}
                          value={topic.name}
                          onChange={(e) => handleTopicChange(uIdx, tIdx, e.target.value)}
                          placeholder={unit.isLab ? 'Experiment title' : 'Topic name'}
                        />
                        <button
                          onClick={() => removeTopic(uIdx, tIdx)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors shrink-0"
                          title={unit.isLab ? 'Remove experiment' : 'Remove topic'}
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    ))}
                    {unit.topics.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1 italic">
                        {unit.isLab ? 'No experiments in this section yet.' : 'No topics in this unit yet.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}


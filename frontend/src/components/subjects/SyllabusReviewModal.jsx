import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Field, inputClass, cx } from '../shared.jsx';
import { useCreateUnit, useCreateTopic } from '../../services/apiHooks.js';
import apiClient from '../../services/apiClient.js';
import { Trash2, Plus, GripVertical } from 'lucide-react';

export default function SyllabusReviewModal({ subjectId, parsedData, onClose, onSuccess }) {
  const [units, setUnits] = useState(parsedData.units || []);
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
      await apiClient.post(`/subjects/${subjectId}/syllabus/confirm`, { units });
      onSuccess();
      onClose();
    } catch (err) {
      alert('Failed to save syllabus structure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal 
      title="Review Extracted Syllabus" 
      eyebrow="Please verify the automatically extracted structure"
      onClose={onClose}
      footer={
        <div className="flex justify-between w-full items-center">
          <p className="text-xs text-muted-foreground">You can edit these later.</p>
          <div className="flex gap-3">
            <Button variant="quiet" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Confirm & Save'}</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {units.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No units were extracted.</p>
        )}
        
        {units.map((unit, uIdx) => (
          <div key={uIdx} className="rounded-xl border border-border p-4 bg-card/50">
            <div className="flex items-center gap-3 mb-4">
              <GripVertical size={16} className="text-muted-foreground/50 cursor-grab" />
              <input 
                className={cx(inputClass, 'font-semibold')} 
                value={unit.name} 
                onChange={(e) => handleUnitChange(uIdx, e.target.value)} 
              />
              <button onClick={() => removeUnit(uIdx)} className="p-2 text-destructive/70 hover:bg-destructive/10 rounded-md transition-colors"><Trash2 size={16}/></button>
            </div>
            
            <div className="ml-8 space-y-2 border-l-2 border-border/50 pl-4">
              {unit.topics.map((topic, tIdx) => (
                <div key={tIdx} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{tIdx + 1}.</span>
                  <input 
                    className={cx(inputClass, 'h-8 text-sm')} 
                    value={topic.name} 
                    onChange={(e) => handleTopicChange(uIdx, tIdx, e.target.value)} 
                  />
                  <button onClick={() => removeTopic(uIdx, tIdx)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"><Trash2 size={14}/></button>
                </div>
              ))}
              {unit.topics.length === 0 && (
                <p className="text-xs text-muted-foreground py-1">No topics. Add some manually later.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

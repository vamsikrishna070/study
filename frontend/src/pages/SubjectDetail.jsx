import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Circle, ArrowLeft, Plus, ChevronDown, ChevronRight, Play } from 'lucide-react';
import apiClient from '../services/apiClient.js';
import { useCreateUnit, useCreateTopic, useCreateImportantPoint } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { PageHeading, Button, LoadingBlock, QueryState, cx, Modal, Field, inputClass } from '../components/shared.jsx';

function UnitForm({ subjectId, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const create = useCreateUnit();

  const submit = (e) => {
    e.preventDefault();
    create.mutate({ data: { subjectId, title } }, {
      onSuccess: () => {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <form id="unit-form" onSubmit={submit} className="flex h-full flex-col">
      <Modal 
        title="Add a Unit" 
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="unit-form" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Add Unit'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Unit Title">
            <input required className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Memory Management" />
          </Field>
        </div>
      </Modal>
    </form>
  );
}

function TopicForm({ subjectId, unitId, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const create = useCreateTopic();

  const submit = (e) => {
    e.preventDefault();
    create.mutate({ data: { subjectId, unit: unitId, name, completed: false } }, {
      onSuccess: () => {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <form id="topic-form" onSubmit={submit} className="flex h-full flex-col">
      <Modal 
        title="Add a Topic" 
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="topic-form" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Add Topic'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Topic Name">
            <input required className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Virtual Memory" />
          </Field>
        </div>
      </Modal>
    </form>
  );
}

function ImportantPointForm({ subjectId, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const create = useCreateImportantPoint();

  const submit = (e) => {
    e.preventDefault();
    create.mutate({ data: { subjectId, title, content } }, {
      onSuccess: () => {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <form id="important-point-form" onSubmit={submit} className="flex h-full flex-col">
      <Modal 
        title="Save a Key Point" 
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="important-point-form" disabled={create.isPending}>{create.isPending ? 'Saving...' : 'Save Point'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Title">
            <input required className={inputClass} value={title} onChange={e => setTitle(e.target.value)} placeholder="A quick summary" />
          </Field>
          <Field label="Content">
            <textarea required className={cx(inputClass, 'min-h-[100px] resize-y')} value={content} onChange={e => setContent(e.target.value)} placeholder="The core concept..." />
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
  const [error, setError] = useState('');
  
  const [expandedUnits, setExpandedUnits] = useState({});
  const [openUnitForm, setOpenUnitForm] = useState(false);
  const [openTopicFormForUnit, setOpenTopicFormForUnit] = useState(null);
  const [openPointForm, setOpenPointForm] = useState(false);

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
        apiClient.get(`/important-points?subjectId=${id}`)
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
      setError('Could not load subject details');
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleTopic = async (topic) => {
    try {
      const newStatus = topic.status === 'completed' ? 'not-started' : 'completed';
      await apiClient.patch(`/topics/${topic._id}`, { status: newStatus });
      setTopics(topics.map(t => t._id === topic._id ? { ...t, status: newStatus } : t));
    } catch (err) {
      // ignore
    }
  };

  if (loading) return <Shell><LoadingBlock lines={8}/></Shell>;
  if (error || !subject) return <Shell><QueryState error={error} onRetry={fetchData} label="Subject" /></Shell>;

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-3">
        <Link to="/subjects" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ArrowLeft size={18}/></Link>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Back to Subjects</span>
      </div>
      
      <PageHeading 
        eyebrow={`${subject.code} · ${subject.credits} Credits`} 
        title={subject.name} 
        detail={subject.description || 'No description provided.'} 
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl">Syllabus</h2>
            <Button variant="quiet" onClick={() => setOpenUnitForm(true)} className="text-xs py-1.5 px-3"><Plus size={14}/> Add Unit</Button>
          </div>
          
          <div className="space-y-4">
            {units.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                <BookOpen size={24} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">No units added yet.</p>
              </div>
            ) : (
              units.map((unit, idx) => {
                const unitTopics = topics.filter(t => t.unit === unit._id);
                const isExpanded = expandedUnits[unit._id];
                const completedCount = unitTopics.filter(t => t.status === 'completed').length;
                
                return (
                  <div key={unit._id} className="rounded-xl border border-card-border bg-card overflow-hidden">
                    <button 
                      onClick={() => toggleUnit(unit._id)}
                      className="flex w-full items-center justify-between bg-secondary/50 p-4 text-left transition-colors hover:bg-secondary"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown size={18} className="text-muted-foreground"/> : <ChevronRight size={18} className="text-muted-foreground"/>}
                        <span className="font-semibold text-sm">Unit {idx + 1}: {unit.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">{completedCount}/{unitTopics.length} done</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-background">
                          <div className="h-full bg-accent transition-all duration-500" style={{width: `${unitTopics.length ? (completedCount/unitTopics.length)*100 : 0}%`}}/>
                        </div>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-2 border-t border-border">
                        {unitTopics.length === 0 ? (
                          <p className="p-4 text-xs text-muted-foreground text-center">No topics in this unit.</p>
                        ) : (
                          unitTopics.map(topic => (
                            <div key={topic._id} className="flex items-center justify-between rounded-lg p-2 hover:bg-background group transition-colors">
                              <button onClick={() => toggleTopic(topic)} className="flex items-center gap-3 text-left">
                                {topic.status === 'completed' ? (
                                  <CheckCircle size={16} className="text-accent" />
                                ) : (
                                  <Circle size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                                )}
                                <span className={cx('text-sm transition-all', topic.status === 'completed' && 'text-muted-foreground line-through opacity-70')}>{topic.name}</span>
                              </button>
                              <Link to={`/study-session?subject=${subject._id}&topic=${topic._id}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors" title="Start Focus Session">
                                <Play size={14} />
                              </Link>
                            </div>
                          ))
                        )}
                        <button onClick={() => setOpenTopicFormForUnit(unit._id)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg p-2 text-xs font-semibold text-muted-foreground hover:bg-background hover:text-foreground transition-colors">
                          <Plus size={14}/> Add topic
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl text-accent">Important Points</h3>
              <button onClick={() => setOpenPointForm(true)} className="rounded p-1 hover:bg-accent/20 text-accent transition-colors"><Plus size={16}/></button>
            </div>
            
            {importantPoints.length === 0 ? (
              <p className="text-xs text-muted-foreground">No points saved yet.</p>
            ) : (
              <div className="space-y-3">
                {importantPoints.map(point => (
                  <div key={point._id} className="rounded-lg bg-card border border-accent/10 p-3 shadow-sm">
                    <h4 className="text-sm font-semibold">{point.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{point.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {openUnitForm && <UnitForm subjectId={id} onClose={() => setOpenUnitForm(false)} onSuccess={fetchData} />}
      {openTopicFormForUnit && <TopicForm subjectId={id} unitId={openTopicFormForUnit} onClose={() => setOpenTopicFormForUnit(null)} onSuccess={fetchData} />}
      {openPointForm && <ImportantPointForm subjectId={id} onClose={() => setOpenPointForm(false)} onSuccess={fetchData} />}
    </Shell>
  );
}

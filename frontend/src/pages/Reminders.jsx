import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Plus, Trash2, Clock, CalendarDays, Repeat, Volume2, VolumeX, UploadCloud, Play, Pause } from 'lucide-react';
import { getGetRemindersQueryKey, useCreateReminder, useDeleteReminder, useGetReminders, useUpdateReminder, useGetSubjects, useGetSyllabi, uploadFile } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, Field, LoadingBlock, Modal, PageHeading, QueryState, cx, inputClass } from '../components/shared.jsx';

const SOUND_PRESETS = [
  { id: 'default', name: 'Default Bell' },
  { id: 'chime', name: 'Chime' },
  { id: 'gentle', name: 'Gentle Alert' },
  { id: 'digital', name: 'Digital Alarm' },
  { id: 'custom', name: 'Custom Audio File...' },
];

const WEEKDAYS = [
  { id: 0, label: 'Sun' },
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
];

const fmtDateStr = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function ReminderForm({ initial, onClose }) {
  const qc = useQueryClient();
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const subjectsQuery = useGetSubjects();
  const subjects = subjectsQuery.data || [];
  const syllabiQuery = useGetSyllabi();
  const syllabi = syllabiQuery.data || [];
  const audioInputRef = useRef(null);

  const [previewAudio, setPreviewAudio] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const initDate = initial?.remindAt ? new Date(initial.remindAt) : new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const initDateStr = `${initDate.getFullYear()}-${pad(initDate.getMonth() + 1)}-${pad(initDate.getDate())}`;
  const initTimeStr = `${pad(initDate.getHours())}:${pad(initDate.getMinutes())}`;

  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    scheduleType: initial?.scheduleType || 'one-time',
    category: initial?.category || 'general',
    priority: initial?.priority || 'medium',
    date: initDateStr,
    time: initTimeStr,
    weekday: initial?.weekday !== undefined ? initial.weekday : initDate.getDay(),
    dayOfMonth: initial?.dayOfMonth || initDate.getDate(),
    month: initial?.month !== undefined ? initial.month : initDate.getMonth() + 1,
    subject: initial?.subject?._id || initial?.subject || '',
    unit: initial?.unit || '',
    topic: initial?.topic || '',
    notificationEnabled: initial?.notificationEnabled ?? true,
    soundId: initial?.soundId || 'default',
    soundName: initial?.soundName || 'Default Bell',
    soundUri: initial?.soundUri || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
    };
  }, [previewAudio]);

  const playPreview = (url) => {
    if (!url) return;
    if (previewAudio) {
      previewAudio.pause();
      if (isPlayingPreview) {
        setIsPlayingPreview(false);
        return;
      }
    }
    const audio = new Audio(url);
    audio.onended = () => setIsPlayingPreview(false);
    audio.onerror = () => setIsPlayingPreview(false);
    audio.play().then(() => {
      setPreviewAudio(audio);
      setIsPlayingPreview(true);
    }).catch(() => setIsPlayingPreview(false));
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    try {
      const res = await uploadFile(file);
      set('soundId', 'custom');
      set('soundName', file.name.replace(/\.[^.]+$/, ''));
      set('soundUri', res.url);
      playPreview(res.url);
    } catch {
      alert('Failed to upload audio file. Please choose an MP3 or WAV file.');
    } finally {
      setUploadingAudio(false);
    }
  };

  const selectedSyllabus = form.subject ? syllabi.find(s => s.subject?._id === form.subject || s.subject === form.subject) : null;
  const availableUnits = selectedSyllabus?.units || [];
  const selectedUnitData = form.unit ? availableUnits.find(u => u._id === form.unit) : null;
  const availableTopics = selectedUnitData?.topics || [];

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Please enter a reminder title.');
      return;
    }

    const [hours, minutes] = form.time.split(':').map(Number);
    let targetDate;
    if (form.scheduleType === 'one-time') {
      targetDate = new Date(`${form.date}T${form.time}:00`);
    } else {
      targetDate = new Date();
      targetDate.setHours(hours, minutes, 0, 0);
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      scheduleType: form.scheduleType,
      category: form.category,
      priority: form.priority,
      remindAt: targetDate.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notificationEnabled: form.notificationEnabled,
      soundId: form.soundId,
      soundName: form.soundName,
      soundUri: form.soundUri,
      ...(form.subject ? { subject: form.subject } : {}),
      ...(form.unit ? { unit: form.unit } : {}),
      ...(form.topic ? { topic: form.topic } : {}),
    };

    const done = () => {
      qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() });
      onClose();
    };

    initial
      ? update.mutate({ id: initial.id || initial._id, data: payload }, { onSuccess: done })
      : create.mutate({ data: payload }, { onSuccess: done });
  };

  const isOneTime = form.scheduleType === 'one-time';

  return (
    <Modal
      title={initial ? 'Edit Reminder' : 'Set a Reminder'}
      eyebrow="Never miss a study milestone"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={create.isPending || update.isPending || uploadingAudio}>
            {create.isPending || update.isPending ? 'Saving…' : initial ? 'Save changes' : 'Save Reminder'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <Field label="What to remember *">
          <input
            required
            className={inputClass}
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Operating Systems Chapter 2 Quiz, Submit Lab 3"
          />
        </Field>

        <Field label="Description (optional)">
          <textarea
            className={cx(inputClass, 'min-h-[64px] resize-y')}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Add any helpful instructions or notes..."
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Repeat">
            <select
              className={inputClass}
              value={form.scheduleType}
              onChange={e => set('scheduleType', e.target.value)}
            >
              <option value="one-time">None (One-time)</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </Field>

          {isOneTime ? (
            <Field label="Date *">
              <input
                required
                type="date"
                className={inputClass}
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </Field>
          ) : form.scheduleType === 'weekly' ? (
            <Field label="Day of Week *">
              <select
                className={inputClass}
                value={form.weekday}
                onChange={e => set('weekday', Number(e.target.value))}
              >
                {WEEKDAYS.map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </Field>
          ) : form.scheduleType === 'monthly' ? (
            <Field label="Day of Month *">
              <input
                required
                type="number"
                min="1"
                max="31"
                className={inputClass}
                value={form.dayOfMonth}
                onChange={e => set('dayOfMonth', Number(e.target.value))}
              />
            </Field>
          ) : (
            <Field label="Time *">
              <input
                required
                type="time"
                className={inputClass}
                value={form.time}
                onChange={e => set('time', e.target.value)}
              />
            </Field>
          )}
        </div>

        {isOneTime && (
          <Field label="Time *">
            <input
              required
              type="time"
              className={inputClass}
              value={form.time}
              onChange={e => set('time', e.target.value)}
            />
          </Field>
        )}

        {(form.scheduleType === 'weekly' || form.scheduleType === 'monthly') && (
          <Field label="Time *">
            <input
              required
              type="time"
              className={inputClass}
              value={form.time}
              onChange={e => set('time', e.target.value)}
            />
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <select className={inputClass} value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="general">General</option>
              <option value="study">Study</option>
              <option value="exam">Exam</option>
              <option value="assignment">Assignment</option>
            </select>
          </Field>

          <Field label="Priority">
            <select className={inputClass} value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
        </div>

        <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">
              Reminder Sound
            </label>
            {form.soundUri && (
              <Button
                type="button"
                variant="quiet"
                onClick={() => playPreview(form.soundUri)}
                className="h-7 gap-1 px-2.5 text-xs text-accent"
              >
                {isPlayingPreview ? <Pause size={13} /> : <Play size={13} />}
                {isPlayingPreview ? 'Stop' : 'Preview'}
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <select
              className={cx(inputClass, 'flex-1')}
              value={form.soundId}
              onChange={e => {
                const val = e.target.value;
                set('soundId', val);
                const found = SOUND_PRESETS.find(s => s.id === val);
                if (found) set('soundName', found.name);
                if (val !== 'custom') {
                  set('soundUri', '');
                } else {
                  audioInputRef.current?.click();
                }
              }}
            >
              {SOUND_PRESETS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {form.soundId === 'custom' && (
              <Button
                type="button"
                variant="quiet"
                onClick={() => audioInputRef.current?.click()}
                disabled={uploadingAudio}
                className="h-11 shrink-0 gap-1.5 px-3 text-xs"
              >
                <UploadCloud size={15} />
                {uploadingAudio ? 'Uploading…' : 'Choose Audio'}
              </Button>
            )}
            <input
              type="file"
              ref={audioInputRef}
              onChange={handleAudioUpload}
              accept="audio/*"
              className="hidden"
            />
          </div>

          {form.soundId === 'custom' && form.soundName && (
            <p className="text-xs text-accent font-medium">
              Selected: {form.soundName}
            </p>
          )}
        </div>

        <Field label="Link to Subject (optional)">
          <select
            className={inputClass}
            value={form.subject}
            onChange={e => { set('subject', e.target.value); set('unit', ''); set('topic', ''); }}
          >
            <option value="">None (Standalone reminder)</option>
            {subjects.map(s => (
              <option key={s.id || s._id} value={s.id || s._id}>
                {s.name} {s.code ? `(${s.code})` : ''}
              </option>
            ))}
          </select>
        </Field>

        {form.subject && availableUnits.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Unit (optional)">
              <select className={inputClass} value={form.unit} onChange={e => { set('unit', e.target.value); set('topic', ''); }}>
                <option value="">Select unit</option>
                {availableUnits.map(u => (
                  <option key={u._id || u.id} value={u._id || u.id}>{u.name || u.title}</option>
                ))}
              </select>
            </Field>

            {form.unit && availableTopics.length > 0 && (
              <Field label="Topic (optional)">
                <select className={inputClass} value={form.topic} onChange={e => set('topic', e.target.value)}>
                  <option value="">Select topic</option>
                  {availableTopics.map(t => (
                    <option key={t._id || t.id} value={t._id || t.id}>{t.name || t.title}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="notif-toggle"
            checked={form.notificationEnabled}
            onChange={e => set('notificationEnabled', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="notif-toggle" className="text-sm font-medium cursor-pointer">
            Enable notification & sound alert
          </label>
        </div>
      </div>
    </Modal>
  );
}

export default function Reminders() {
  const query = useGetReminders();
  const reminders = query.data || [];
  const del = useDeleteReminder();
  const update = useUpdateReminder();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('upcoming');

  const remove = (rem) => {
    if (confirm(`Delete "${rem.title}"?`)) {
      del.mutate({ id: rem._id || rem.id }, {
        onSuccess: () => qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() })
      });
    }
  };

  const toggleStatus = (rem) => {
    const enabled = !rem.enabled;
    update.mutate({ id: rem._id || rem.id, data: { enabled } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetRemindersQueryKey() })
    });
  };

  const upcoming = reminders.filter(r => r.enabled && r.scheduleType === 'one-time');
  const recurring = reminders.filter(r => r.enabled && r.scheduleType !== 'one-time');
  const completed = reminders.filter(r => !r.enabled);

  const getPriorityColor = (p) => {
    if (p === 'high') return 'text-destructive font-semibold';
    if (p === 'medium') return 'text-accent font-semibold';
    return 'text-muted-foreground';
  };

  let displayed = [];
  if (filter === 'upcoming') displayed = upcoming;
  if (filter === 'recurring') displayed = recurring;
  if (filter === 'completed') displayed = completed;

  return (
    <Shell>
      <PageHeading
        eyebrow="Gentle nudges"
        title="Reminders"
        detail="Offload your future self's responsibilities here."
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }} testId="button-add-reminder">
            <Plus size={16} /> Set a reminder
          </Button>
        }
      />

      <div className="mb-6 flex space-x-1 rounded-xl bg-muted/50 p-1 w-fit">
        <button
          onClick={() => setFilter('upcoming')}
          className={cx("rounded-lg px-4 py-2 text-sm font-semibold transition-all", filter === 'upcoming' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setFilter('recurring')}
          className={cx("rounded-lg px-4 py-2 text-sm font-semibold transition-all", filter === 'recurring' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Recurring ({recurring.length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={cx("rounded-lg px-4 py-2 text-sm font-semibold transition-all", filter === 'completed' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50")}
        >
          Completed ({completed.length})
        </button>
      </div>

      {query.isLoading ? (
        <LoadingBlock lines={5} />
      ) : query.error ? (
        <QueryState error={query.error} onRetry={() => query.refetch()} label="Reminders" />
      ) : !displayed.length ? (
        <EmptyState
          icon={filter === 'recurring' ? Repeat : filter === 'completed' ? Check : Bell}
          title={`No ${filter} reminders`}
          detail={
            filter === 'upcoming'
              ? 'You have no pending one-time reminders scheduled.'
              : filter === 'recurring'
              ? 'No repeating study alarms configured yet.'
              : 'Completed reminders will appear here.'
          }
          action={
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus size={16} /> Set a reminder
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map(r => (
            <div
              key={r._id || r.id}
              className={cx(
                "card-lift flex flex-col gap-3 rounded-2xl border p-5 transition-all",
                !r.enabled ? "border-border bg-background/50 opacity-70" : "border-card-border bg-card"
              )}
            >
              <div className="flex items-start gap-3.5">
                <button
                  onClick={() => toggleStatus(r)}
                  className={cx(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    r.enabled ? "border-muted-foreground/35 hover:border-accent" : "border-accent bg-accent text-accent-foreground"
                  )}
                  title={r.enabled ? 'Mark as completed' : 'Reactivate reminder'}
                >
                  {!r.enabled && <Check size={12} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider bg-secondary text-muted-foreground">
                      {r.category}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditing(r); setOpen(true); }}
                        className="text-muted-foreground hover:text-foreground text-[10px] uppercase font-mono tracking-widest font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(r)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete reminder"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <h4 className={cx("mt-2 font-display text-lg leading-tight", !r.enabled && "line-through text-muted-foreground")}>
                    {r.title}
                  </h4>
                  {r.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <div className={cx("flex items-center gap-1.5", r.enabled && getPriorityColor(r.priority))}>
                  {r.scheduleType !== 'one-time' ? <Repeat size={12} /> : <CalendarDays size={12} />}
                  <span>
                    {r.scheduleType !== 'one-time' ? `${r.scheduleType.toUpperCase()}` : 'ONCE'} · {fmtDateStr(r.remindAt)}
                  </span>
                </div>
                {r.soundName && (
                  <span className="flex items-center gap-1 opacity-75">
                    <Volume2 size={11} /> {r.soundName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {open && <ReminderForm initial={editing} onClose={() => { setOpen(false); setEditing(null); }} />}
    </Shell>
  );
}

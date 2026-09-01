import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, GripVertical, Play, Pause, Square, RotateCcw, Bell } from 'lucide-react';
import { getGetDashboardQueryKey, getGetTasksQueryKey, useCreateTask, useDeleteTask, useGetSubjects, useGetTasks, useUpdateTask } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, Field, LoadingBlock, Modal, PageHeading, QueryState, cx, fmtDate, inputClass } from '../components/shared.jsx';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function TaskForm({ initial, onClose, subjects }) {
  const qc = useQueryClient();
  const create = useCreateTask();
  const update = useUpdateTask();
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    subjectId: initial?.subjectId || subjects[0]?.id || '',
    dueDate: initial?.dueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    dueTime: initial?.dueTime || '19:00',
    priority: initial?.priority || 'medium',
    reminderEnabled: Boolean(initial?.reminderEnabled),
    reminderTime: initial?.reminderTime || '19:00',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      reminderFrequency: form.reminderEnabled ? 'daily' : 'none',
      scheduledStartAt: `${form.dueDate}T${form.dueTime}:00`,
    };
    const done = () => {
      qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      onClose();
    };
    initial ? update.mutate({ id: initial.id, data }, { onSuccess: done }) : create.mutate({ data }, { onSuccess: done });
  };

  return (
    <form id="task-form" onSubmit={submit} className="flex h-full flex-col">
      <Modal
        title={initial ? 'Edit Task' : 'Plan a Task'}
        eyebrow="Execution & Progress"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="task-form" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Saving…' : initial ? 'Save changes' : 'Add Task'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="Task Title *">
            <input required className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Prepare for Gen AI CLA" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Subject">
              <select required className={inputClass} value={form.subjectId} onChange={e => set('subjectId', e.target.value)}>
                {subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}
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
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Complete by Date">
              <input required type="date" className={inputClass} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </Field>
            <Field label="Complete by Time">
              <input type="time" className={inputClass} value={form.dueTime} onChange={e => set('dueTime', e.target.value)} />
            </Field>
          </div>

          <div className="mb-4 px-1">
            <div className="font-semibold text-sm mb-1 text-foreground flex items-center gap-2">
              <span>🔔</span> Deadline alert
            </div>
            <div className="text-xs text-muted-foreground">Automatic 1-hour-before notification.</div>
          </div>

          <Field label="Task reminder (Optional recurring reminder)">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!form.reminderEnabled}
                  onChange={() => set('reminderEnabled', false)}
                  className="text-accent focus:ring-accent"
                  name="taskReminder"
                />
                <span className="font-medium">Off</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="radio"
                  checked={form.reminderEnabled}
                  onChange={() => set('reminderEnabled', true)}
                  className="text-accent focus:ring-accent"
                  name="taskReminder"
                />
                <span className="font-medium">Every 24 hours</span>
              </label>

              {form.reminderEnabled && (
                <input
                  type="time"
                  className={cx(inputClass, 'w-24 py-1 px-2 text-xs ml-auto')}
                  value={form.reminderTime}
                  onChange={e => set('reminderTime', e.target.value)}
                />
              )}
            </div>
          </Field>

          <Field label="Description / Notes">
            <textarea className={cx(inputClass, 'min-h-24 resize-y')} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add task details" />
          </Field>
        </div>
      </Modal>
    </form>
  );
}

function SortableTaskItem({ task, onEdit, onDelete, onSetStatus, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id, data: { ...task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const normStatus = task.status === 'in-progress' ? 'in_progress' : (task.status || 'pending');
  const isPending = normStatus === 'pending';
  const isInProgress = normStatus === 'in_progress';
  const isPaused = normStatus === 'paused';
  const isDone = normStatus === 'completed';

  const formatTimeString = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cx(
        'rounded-xl border bg-background p-4 relative group transition-all',
        isInProgress && 'border-primary ring-1 ring-primary bg-primary/5',
        isPaused && 'border-amber-500/50 bg-amber-500/5',
        isDone && 'opacity-70 border-border bg-muted/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground mt-1" aria-label="Drag handle">
            <GripVertical size={16} />
          </div>
          <div>
            <h3 className={cx('text-sm font-bold leading-5', isDone && 'text-muted-foreground line-through', isInProgress && 'text-primary')}>{task.title}</h3>

            <div className="mt-1 text-xs">
              {isPending && (
                <span className="text-muted-foreground font-mono">Complete by: {task.dueTime ? `${task.dueTime} · ` : ''}{fmtDate(task.dueDate)}</span>
              )}
              {isInProgress && (
                <span className="text-primary font-semibold flex items-center gap-1">▶ Started: {formatTimeString(task.lastStartedAt || task.startedAt || task.updatedAt)}</span>
              )}
              {isPaused && (
                <span className="text-amber-500 font-semibold flex items-center gap-1">⏸ Stopped: {formatTimeString(task.stoppedAt || task.updatedAt)}</span>
              )}
              {isDone && (
                <span className="text-accent font-semibold flex items-center gap-1">✓ Completed: {formatTimeString(task.completedAt || task.updatedAt)}</span>
              )}

              {!isDone && task.reminderEnabled && (
                <span className="text-[11px] text-accent font-mono block mt-0.5">🔔 Daily at {task.reminderTime || '7:00 PM'}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button onClick={() => onEdit(task)} className="rounded p-1 text-muted-foreground hover:bg-muted" title="Edit task"><Pencil size={13} /></button>
          <button onClick={() => onDelete(task)} className="rounded p-1 text-muted-foreground hover:text-destructive" title="Delete task"><Trash2 size={13} /></button>
        </div>
      </div>

      <p className="mt-2 pl-7 text-xs text-muted-foreground">{task.subject}</p>
      <div className="mt-3 pl-7 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
        <span className={cx('font-mono uppercase', task.priority === 'high' ? 'text-accent font-bold' : '')}>{task.priority}</span>
      </div>

      <div className="mt-3 pl-7 flex items-center gap-2">
        {isPending && (
          <button
            onClick={() => onSetStatus(task.id, 'in_progress')}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary py-1.5 px-3 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Play size={12} fill="currentColor" /> START
          </button>
        )}

        {isInProgress && (
          <>
            <button
              onClick={() => onSetStatus(task.id, 'paused')}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-amber-500 py-1.5 px-3 text-xs font-bold text-white hover:opacity-90 transition-opacity"
            >
              <Pause size={12} fill="currentColor" /> STOP
            </button>
            <button
              onClick={() => onSetStatus(task.id, 'completed')}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-accent py-1.5 px-3 text-xs font-bold text-accent-foreground hover:opacity-90 transition-opacity"
            >
              <Square size={12} fill="currentColor" /> END
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={() => onSetStatus(task.id, 'in_progress')}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-primary py-1.5 px-3 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Play size={12} fill="currentColor" /> START
            </button>
            <button
              onClick={() => onSetStatus(task.id, 'completed')}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-accent py-1.5 px-3 text-xs font-bold text-accent-foreground hover:opacity-90 transition-opacity"
            >
              <Square size={12} fill="currentColor" /> END
            </button>
          </>
        )}

        {isDone && (
          <button
            onClick={() => onSetStatus(task.id, 'pending')}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border bg-background py-1.5 px-3 text-xs font-bold text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw size={12} /> RESTART
          </button>
        )}
      </div>
    </article>
  );
}

import { useDroppable } from '@dnd-kit/core';

function DroppableColumn({ id, title, count, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className="rounded-2xl border border-card-border bg-card p-4 flex flex-col min-h-[400px]">
      <div className="mb-4 flex items-center justify-between px-2">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-bold">{count}</span>
      </div>
      <div className="flex-1 space-y-3 min-h-[200px]" id={id}>
        {children}
      </div>
    </section>
  );
}

export function TasksPage() {
  const subjects = (useGetSubjects().data || []);
  const query = useGetTasks();
  const tasks = query.data || [];
  const update = useUpdateTask();
  const del = useDeleteTask();
  const qc = useQueryClient();

  const [editing, setEditing] = useState();
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  const setStatus = (taskId, status) => {
    update.mutate({ id: taskId, data: { status: status } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      }
    });
  };

  const remove = (t) => {
    if (confirm(`Delete “${t.title}”?`)) {
      del.mutate({ id: t.id }, {
        onSuccess: () => qc.invalidateQueries({ queryKey: getGetTasksQueryKey() })
      });
    }
  };

  const groups = [
    { id: 'pending', label: 'Pending' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'paused', label: 'Paused' },
    { id: 'completed', label: 'Completed' }
  ];

  const handleDragStart = (e) => {
    setActiveId(e.active.id);
  };

  const handleDragEnd = (e) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id;

    let targetStatus = groups.find(g => g.id === overId)?.id;
    if (!targetStatus) {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status === 'in-progress' ? 'in_progress' : (overTask.status || 'pending');
      }
    }

    if (targetStatus && activeTask) {
      const currentNorm = activeTask.status === 'in-progress' ? 'in_progress' : (activeTask.status || 'pending');
      if (currentNorm !== targetStatus) {
        setStatus(activeTask.id, targetStatus);
      }
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <Shell>
      <PageHeading
        eyebrow="Execution & Progress"
        title="Tasks"
        detail="Manage your study tasks with explicit lifecycle controls: Start, Stop, and End."
        action={<Button onClick={() => { setEditing(undefined); setOpen(true); }}><Plus size={16} /> Add Task</Button>}
      />

      {query.isLoading ? <LoadingBlock lines={6} /> : query.error ? <QueryState error={query.error} onRetry={() => query.refetch()} label="Tasks" /> : (
        <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {groups.map((group) => {
              const groupTasks = tasks.filter(t => {
                const norm = t.status === 'in-progress' ? 'in_progress' : (t.status || 'pending');
                return norm === group.id;
              });
              return (
                <DroppableColumn key={group.id} id={group.id} title={group.label} count={groupTasks.length}>
                  <SortableContext items={groupTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {groupTasks.map((t) => (
                      <SortableTaskItem key={t.id} task={t} onEdit={(task) => { setEditing(task); setOpen(true); }} onDelete={remove} onSetStatus={(id, st) => setStatus(id, st)} isDragging={activeId === t.id} />
                    ))}
                  </SortableContext>
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? <SortableTaskItem task={activeTask} onEdit={()=>{}} onDelete={()=>{}} onSetStatus={()=>{}} isDragging={false} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {open && <TaskForm initial={editing} subjects={subjects} onClose={() => setOpen(false)} />}
    </Shell>
  );
}

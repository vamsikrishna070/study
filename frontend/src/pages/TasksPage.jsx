import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Trash2, GripVertical } from 'lucide-react';
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
    priority: initial?.priority || 'medium',
    duration: String(initial?.duration || 45)
  });
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const submit = (e) => {
    e.preventDefault();
    const data = { ...form, duration: Number(form.duration) };
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
        title={initial ? 'Edit study task' : 'Plan a study task'} 
        eyebrow="Make progress visible" 
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="quiet" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="task-form" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Saving…' : initial ? 'Save changes' : 'Add task'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="Task">
            <input required className={inputClass} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Enter task title" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Subject">
              <select required className={inputClass} value={form.subjectId} onChange={e => set('subjectId', e.target.value)}>
                {subjects.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Due date">
              <input required type="date" className={inputClass} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Priority">
              <select className={inputClass} value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
            <Field label="Est. Duration">
              <div className="relative">
                <input required type="number" min="5" max="300" step="5" className={inputClass} value={form.duration} onChange={e => set('duration', e.target.value)} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mins</span>
              </div>
            </Field>
          </div>
          <Field label="Description">
            <textarea className={cx(inputClass, 'min-h-24 resize-y')} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Add task details" />
          </Field>
        </div>
      </Modal>
    </form>
  );
}

function SortableTaskItem({ task, onEdit, onDelete, isDragging }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id, data: { ...task } });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <article ref={setNodeRef} style={style} className="rounded-xl border border-border bg-background p-4 relative group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2">
          <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground mt-0.5" aria-label="Drag handle">
            <GripVertical size={16} />
          </div>
          <div className={cx('mt-0.5 h-4 w-4 shrink-0 rounded-full border-2', task.status === 'completed' ? 'border-accent bg-accent' : 'border-muted-foreground/35')}>
            {task.status === 'completed' && <Check size={11} className="text-accent-foreground" />}
          </div>
          <h3 className={cx('text-sm font-bold leading-5', task.status === 'completed' && 'text-muted-foreground line-through')}>{task.title}</h3>
        </div>
        <div className="flex shrink-0">
          <button onClick={() => onEdit(task)} className="rounded p-1 text-muted-foreground hover:bg-muted"><Pencil size={13} /></button>
          <button onClick={() => onDelete(task)} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
        </div>
      </div>
      <p className="mt-3 pl-7 text-xs text-muted-foreground">{task.subject}</p>
      <div className="mt-4 pl-7 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className={cx('font-mono uppercase', task.priority === 'high' ? 'text-accent' : '')}>{task.priority} · {task.duration} min</span>
        <span>{fmtDate(task.dueDate)}</span>
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
        <h2 className="font-display text-2xl">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-1 font-mono text-[10px]">{count}</span>
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
    { id: 'pending', label: 'Up next' },
    { id: 'in-progress', label: 'In focus' },
    { id: 'completed', label: 'Complete' }
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

    // Over can be a column id (pending, in-progress, completed) or a task id
    let targetStatus = groups.find(g => g.id === overId)?.id;
    if (!targetStatus) {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus && activeTask && activeTask.status !== targetStatus) {
      setStatus(activeTask.id, targetStatus);
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <Shell>
      <PageHeading eyebrow="The next right thing" title="Tasks" detail="Turn a broad intention into one clear block of work." action={<Button onClick={() => { setEditing(undefined); setOpen(true); }}><Plus size={16} /> Plan task</Button>} />
      
      {query.isLoading ? <LoadingBlock lines={6} /> : query.error ? <QueryState error={query.error} onRetry={() => query.refetch()} label="Tasks" /> : (
        <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid gap-5 lg:grid-cols-3">
            {groups.map((group) => {
              const groupTasks = tasks.filter(t => t.status === group.id);
              return (
                <DroppableColumn key={group.id} id={group.id} title={group.label} count={groupTasks.length}>
                  <SortableContext items={groupTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {groupTasks.map((t) => (
                      <SortableTaskItem key={t.id} task={t} onEdit={(task) => { setEditing(task); setOpen(true); }} onDelete={remove} isDragging={activeId === t.id} />
                    ))}
                  </SortableContext>
                </DroppableColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? <SortableTaskItem task={activeTask} onEdit={()=>{}} onDelete={()=>{}} isDragging={false} /> : null}
          </DragOverlay>
        </DndContext>
      )}
      
      {open && <TaskForm initial={editing} subjects={subjects} onClose={() => setOpen(false)} />}
    </Shell>
  );
}

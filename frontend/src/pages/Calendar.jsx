import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { useGetExams, useGetReminders, useGetTasks } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { PageHeading, Button, LoadingBlock, cx } from '../components/shared.jsx';

const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: exams, isLoading: eLoading } = useGetExams();
  const { data: tasks, isLoading: tLoading } = useGetTasks();
  const { data: reminders, isLoading: rLoading } = useGetReminders();

  const loading = eLoading || tLoading || rLoading;

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const daysCount = daysInMonth(month, year);
  const startDay = firstDayOfMonth(month, year);
  
  // Format dates strictly for equality checks
  const toDateString = (d) => {
    if (!d) return '';
    return new Date(d).toISOString().slice(0, 10);
  };

  const getEventsForDay = (day) => {
    const dateStr = new Date(year, month, day + 1).toISOString().slice(0, 10);
    const dayExams = (exams || []).filter(e => toDateString(e.date) === dateStr).map(e => ({ ...e, eventType: 'exam' }));
    const dayTasks = (tasks || []).filter(t => toDateString(t.dueDate) === dateStr).map(t => ({ ...t, eventType: 'task' }));
    const dayRems = (reminders || []).filter(r => toDateString(r.remindAt || r.date) === dateStr).map(r => ({ ...r, eventType: 'reminder' }));
    return [...dayExams, ...dayTasks, ...dayRems];
  };

  return (
    <Shell>
      <PageHeading eyebrow="Time mapped out" title="Calendar" detail="See where the heavy weeks land." />
      
      {loading ? <LoadingBlock lines={8} /> : (
        <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-3xl">{monthName} <span className="text-muted-foreground">{year}</span></h2>
            <div className="flex items-center gap-2">
              <Button variant="quiet" onClick={goToday} className="px-3 text-xs h-8">Today</Button>
              <div className="flex rounded-lg border border-border">
                <button onClick={prevMonth} className="px-2 py-1.5 hover:bg-muted"><ChevronLeft size={18}/></button>
                <div className="w-px bg-border"/>
                <button onClick={nextMonth} className="px-2 py-1.5 hover:bg-muted"><ChevronRight size={18}/></button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px rounded-xl border border-border bg-border overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-muted p-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {d}
              </div>
            ))}
            
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card min-h-[100px] p-2 opacity-30" />
            ))}
            
            {Array.from({ length: daysCount }).map((_, i) => {
              const day = i + 1;
              const isToday = toDateString(new Date()) === new Date(year, month, day + 1).toISOString().slice(0, 10);
              const events = getEventsForDay(i);
              
              return (
                <div key={day} className={cx("bg-card min-h-[100px] p-2 transition-colors hover:bg-secondary/20 group relative", isToday && 'bg-accent/5')}>
                  <div className={cx("w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mb-1", isToday ? "bg-accent text-accent-foreground" : "text-muted-foreground")}>
                    {day}
                  </div>
                  
                  <div className="space-y-1">
                    {events.map((evt, idx) => (
                      <div 
                        key={idx} 
                        className={cx(
                          "truncate rounded px-1.5 py-0.5 text-[9px] font-semibold border-l-2",
                          evt.eventType === 'exam' ? 'border-destructive bg-destructive/10 text-destructive' :
                          evt.eventType === 'task' ? 'border-primary bg-secondary text-primary' :
                          'border-accent bg-accent/10 text-accent'
                        )}
                        title={evt.title || evt.name}
                      >
                        {evt.title || evt.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}

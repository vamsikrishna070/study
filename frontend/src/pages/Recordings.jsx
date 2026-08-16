import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mic, Play, Pause, Trash2, StopCircle } from 'lucide-react';
import { getGetRecordingsQueryKey, useGetRecordings, useDeleteRecording } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { Button, EmptyState, LoadingBlock, PageHeading, QueryState, fmtDate } from '../components/shared.jsx';

export default function Recordings() {
  const query = useGetRecordings();
  const recordings = query.data || [];
  const del = useDeleteRecording();
  const qc = useQueryClient();
  const [playing, setPlaying] = useState(null);

  const remove = (rec) => {
    if (confirm(`Delete recording "${rec.title}"?`)) {
      del.mutate({ id: rec.id }, {
        onSuccess: () => qc.invalidateQueries({ queryKey: getGetRecordingsQueryKey() })
      });
    }
  };

  const togglePlay = (rec) => {
    if (playing === rec.id) {
      setPlaying(null);
    } else {
      setPlaying(rec.id);
    }
  };

  return (
    <Shell>
      <PageHeading 
        eyebrow="Voice memos" 
        title="Recordings" 
        detail="Capture thoughts out loud before they slip away." 
        action={
          <Button onClick={() => window.location.href='/study-session'}>
            <Mic size={16} /> New Recording
          </Button>
        }
      />

      {query.isLoading ? <LoadingBlock lines={5}/> : 
       query.error ? <QueryState error={query.error} onRetry={() => query.refetch()} label="Recordings"/> : 
       !recordings.length ? (
         <EmptyState 
           icon={Mic} 
           title="No recordings yet" 
           detail="Start a study session to record your voice notes." 
           action={
             <Button onClick={() => window.location.href='/study-session'}>
               <Mic size={16} /> Start session
             </Button>
           }
         />
       ) : (
         <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
           {recordings.map(rec => (
             <article key={rec.id} className="card-lift flex flex-col rounded-2xl border border-card-border bg-card p-5">
               <div className="flex items-start justify-between gap-3">
                 <div>
                   <h2 className="font-display text-2xl leading-tight">{rec.title}</h2>
                   <p className="mt-1 text-xs text-muted-foreground">{fmtDate(rec.createdAt)}</p>
                 </div>
                 <button onClick={() => remove(rec)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                   <Trash2 size={16}/>
                 </button>
               </div>
               
               <div className="mt-6 flex items-center gap-4">
                 <button 
                   onClick={() => togglePlay(rec)} 
                   className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md hover:bg-accent/90"
                 >
                   {playing === rec.id ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}
                 </button>
                 
                 <div className="flex-1">
                   <div className="h-1.5 w-full rounded-full bg-secondary">
                     <div className="h-full rounded-full bg-accent" style={{width: playing === rec.id ? '45%' : '0%'}} />
                   </div>
                   <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
                     <span>{playing === rec.id ? '00:12' : '00:00'}</span>
                     <span>{rec.duration ? `${Math.floor(rec.duration / 60)}:${(rec.duration % 60).toString().padStart(2, '0')}` : '--:--'}</span>
                   </div>
                 </div>
               </div>

               {rec.audioData && playing === rec.id && (
                 <audio src={rec.audioData} autoPlay className="hidden" onEnded={() => setPlaying(null)}/>
               )}

               <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted-foreground">
                 <span className="font-semibold text-foreground">{rec.subject?.name || 'General'}</span>
                 {rec.topic?.name && <span>{rec.topic.name}</span>}
               </div>
             </article>
           ))}
         </div>
       )}
    </Shell>
  );
}

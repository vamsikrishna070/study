import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, FileText, CalendarDays, BookOpen, CheckCircle, Clock3, Library } from 'lucide-react';
import { useSearch } from '../services/apiHooks.js';
import Shell from '../components/Shell.jsx';
import { LoadingBlock, PageHeading, cx, inputClass } from '../components/shared.jsx';

const TypeIcon = ({ type }) => {
  switch(type) {
    case 'subject': return <BookOpen size={16} className="text-primary"/>;
    case 'topic': return <CheckCircle size={16} className="text-accent"/>;
    case 'note': return <FileText size={16} className="text-muted-foreground"/>;
    case 'task': return <Clock3 size={16} className="text-secondary-foreground"/>;
    case 'exam': return <CalendarDays size={16} className="text-destructive"/>;
    case 'resource': return <Library size={16} className="text-[#b58a4a]"/>;
    default: return <SearchIcon size={16} />;
  }
};

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(initialQ);
  
  const { data: results, isLoading, error } = useSearch(initialQ, { enabled: initialQ.length > 1 });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (queryInput !== initialQ) {
        setSearchParams(queryInput ? { q: queryInput } : {});
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [queryInput, initialQ, setSearchParams]);

  return (
    <Shell>
      <PageHeading eyebrow="Find anything" title="Search Workspace" detail="Search across subjects, notes, tasks, and more." />
      
      <div className="relative max-w-2xl mb-8">
        <SearchIcon size={18} className="absolute left-4 top-4 text-muted-foreground" />
        <input 
          autoFocus
          className={cx(inputClass, 'pl-11 py-4 text-lg')} 
          value={queryInput} 
          onChange={(e) => setQueryInput(e.target.value)} 
          placeholder="Search StudyArena..." 
        />
      </div>

      {initialQ.length > 1 && (
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">
            {isLoading ? 'Searching...' : `Results for "${initialQ}"`}
          </p>

          {isLoading && <LoadingBlock lines={4} />}
          
          {error && <div className="text-destructive">An error occurred while searching.</div>}

          {!isLoading && !error && results && results.length === 0 && (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground">No matches found across your workspace.</p>
            </div>
          )}

          {!isLoading && !error && results && results.length > 0 && (
            <div className="space-y-3">
              {results.map((res, i) => (
                <div key={`${res.type}-${res.id}-${i}`} className="card-lift flex items-start gap-4 rounded-xl border border-card-border bg-card p-4 transition-colors hover:bg-secondary/20">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <TypeIcon type={res.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{res.type}</span>
                    </div>
                    <h3 className="mt-1 font-bold text-lg">{res.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{res.detail}</p>
                  </div>
                  <Link 
                    to={res.type === 'subject' ? `/subjects/${res.id}` : res.type === 'note' ? '/notes' : res.type === 'task' ? '/tasks' : res.type === 'exam' ? '/exams' : res.type === 'resource' ? '/resources' : '/'}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground hover:bg-muted"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

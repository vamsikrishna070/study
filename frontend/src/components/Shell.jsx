import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Target, ChevronRight, Sparkles, Settings as SettingsIcon, MoreHorizontal, LayoutDashboard, BookOpen, FileText, ListChecks, CalendarDays, Library, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { cx } from './shared.jsx';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/exams', label: 'Exams', icon: CalendarDays },
  { href: '/resources', label: 'Resources', icon: Library },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
];

export default function Shell({ children }) {
  const { pathname: location } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  
  if (!user) return children; // Fallback if no user

  return (
    <div className="grain app-shell md:flex">
      {mobileOpen && <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cx('desktop-sidebar fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col md:flex', mobileOpen && '!flex')}>
        <div className="flex h-full flex-col px-5 py-7">
          <Link to="/" className="mb-11 flex items-center gap-3 px-2" data-testid="link-brand">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Target size={19} /></div>
            <div>
              <div className="font-display text-xl leading-none">StudyArena</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[.17em] opacity-55">Focus, then flow</div>
            </div>
          </Link>
          <div className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[.2em] opacity-45">Workspace</div>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} to={href} onClick={() => setMobileOpen(false)} className={cx('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', location === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground')} data-testid={`link-nav-${label.toLowerCase()}`}>
                <Icon size={17} className={location === href ? 'text-sidebar-primary' : 'opacity-75'} />
                <span>{label}</span>
                {location === href && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
            <div className="flex items-center gap-2 text-sidebar-primary"><Sparkles size={15} /><span className="font-mono text-[10px] uppercase tracking-[.16em]">Study tip</span></div>
            <p className="mt-3 text-xs leading-5 text-sidebar-foreground/65">One focused hour beats three distracted ones. Start small.</p>
          </div>
          <Link to="/settings" className={cx('mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold', location === '/settings' ? 'bg-sidebar-accent' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent')} data-testid="link-settings">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">{user.name?.split(' ').map(p => p[0]).join('').slice(0, 2) || 'U'}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate">{user.name}</div>
              <div className="text-[10px] font-normal opacity-50">{user.degree} / {user.branch}</div>
            </div>
            <SettingsIcon size={15} className="opacity-60" />
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1 md:ml-[248px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-12">
          <button className="focus-ring rounded-lg p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-mobile-menu"><MoreHorizontal size={20} /></button>
          <div className="hidden md:block"><span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Personal academic workspace</span></div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />Semester {user.semester || 1}
            </div>
            <Link to="/settings" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground" data-testid="link-header-profile">{user.name?.split(' ').map(p => p[0]).join('').slice(0, 2) || 'U'}</Link>
          </div>
        </header>
        <main className="page-in mx-auto max-w-[1420px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</main>
      </div>
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-30 items-center justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md">
        {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link to={href} key={href} className={cx('flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[9px] font-bold', location === href ? 'text-accent' : 'text-muted-foreground')} data-testid={`link-mobile-${label.toLowerCase()}`}>
            <Icon size={17} /><span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Target, ChevronRight, Sparkles, Settings as SettingsIcon, MoreHorizontal, LayoutDashboard, BookOpen, FileText, ListChecks, CalendarDays, Library, TrendingUp, Bell, FileStack, History, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { cx } from './shared.jsx';
import { isSrmApStudent } from '../utils/srmAp.js';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/portal', label: 'SRM Portal', icon: GraduationCap },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/study-log', label: 'Study Log', icon: History },
  { href: '/syllabus', label: 'Syllabus', icon: FileStack },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/resources', label: 'Resources', icon: Library },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/exams', label: 'Exams', icon: CalendarDays },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
];

export default function Shell({ children }) {
  const { pathname: location } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  // Filter nav items: only show SRM Portal for SRM AP students
  const visibleNavItems = navItems.filter(
    (item) => item.href !== '/portal' || isSrmApStudent(user)
  );
  
  if (!user) return children;

  const ProfileAvatar = ({ className }) => {
    if (user.profileImageUrl) {
      return (
        <div className={cx("overflow-hidden rounded-full border border-border/50", className)}>
          <img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
        </div>
      );
    }
    return (
      <div className={cx("flex items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary", className)}>
        {user.name?.split(' ').map(p => p[0]).join('').slice(0, 2) || 'U'}
      </div>
    );
  };

  return (
    <div className="grain app-shell md:flex min-h-screen">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}
      
      <aside className={cx('desktop-sidebar fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col bg-card/95 backdrop-blur-md md:flex border-r border-border', mobileOpen && '!flex')}>
        <div className="flex h-full flex-col px-5 py-7 overflow-y-auto">
          <Link to="/" className="mb-8 flex items-center gap-3 px-2" data-testid="link-brand">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Target size={19} /></div>
            <div>
              <div className="font-display text-xl leading-none">StudyArena</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-[.17em] opacity-55">Focus, then flow</div>
            </div>
          </Link>
          <div className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[.2em] opacity-45">Workspace</div>
          <nav className="space-y-1">
            {visibleNavItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} to={href} onClick={() => setMobileOpen(false)} className={cx('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', location === href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground')} data-testid={`link-nav-${label.toLowerCase()}`}>
                <Icon size={17} className={location === href ? 'text-sidebar-primary' : 'opacity-75'} />
                <span>{label}</span>
                {location === href && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            ))}
          </nav>
          
          <div className="mt-auto pt-6">
            <Link to="/settings" onClick={() => setMobileOpen(false)} className={cx('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors', location === '/settings' ? 'bg-sidebar-accent' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent')} data-testid="link-settings">
              <ProfileAvatar className="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <div className="truncate">{user.name}</div>
                <div className="text-[10px] font-normal opacity-50 truncate">{user.degree} {user.branch ? `/ ${user.branch}` : ''}</div>
              </div>
              <SettingsIcon size={15} className="opacity-60" />
            </Link>
          </div>
        </div>
      </aside>
      
      <div className="min-w-0 flex-1 md:ml-[248px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-12">
          <div className="md:hidden flex items-center gap-2 font-display text-xl leading-none">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Target size={14} /></div>
            StudyArena
          </div>
          <div className="hidden md:block"><span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Personal academic workspace</span></div>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />Semester {user.semester || 1}
            </div>
            <Link to="/settings" data-testid="link-header-profile" className="focus-ring rounded-full">
              <ProfileAvatar className="h-9 w-9 bg-primary" />
            </Link>
          </div>
        </header>
        
        <main className="page-in mx-auto w-full max-w-[1420px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10 pb-28 md:pb-10 flex-1">
          {children}
        </main>
      </div>
      
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md pb-safe md:hidden">
        {navItems.filter(item => ['/', '/subjects', '/tasks', '/exams'].includes(item.href)).map(({ href, label, icon: Icon }) => (
          <Link to={href} key={href} onClick={() => setMobileOpen(false)} className={cx('flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors', location === href ? 'text-accent' : 'text-muted-foreground')} data-testid={`link-mobile-${label.toLowerCase()}`}>
            <Icon size={18} /><span>{label}</span>
          </Link>
        ))}
        <button onClick={() => setMobileOpen(true)} className="flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-bold text-muted-foreground transition-colors" data-testid="button-mobile-more">
          <MoreHorizontal size={18} /><span>More</span>
        </button>
      </nav>
    </div>
  );
}

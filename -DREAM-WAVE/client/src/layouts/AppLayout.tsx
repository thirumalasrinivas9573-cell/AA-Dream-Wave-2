import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  CalendarCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Route,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Target,
  Users,
  BarChart3,
  X,
  Bell,
  UserRound,
  FileText,
  FileBadge2,
  Building2,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { dashboardApi, orgsApi } from '../services/endpoints';
import { cn } from '../utils/cn';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ai', label: 'AI Modes', icon: Sparkles },
  { to: '/mentor', label: 'AI Chat', icon: MessageSquareText },
  { to: '/learning', label: 'Learning', icon: BookOpen },
  { to: '/productivity', label: 'Productivity', icon: CalendarCheck2 },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/resume', label: 'Resume', icon: FileBadge2 },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/tasks', label: 'Tasks', icon: CalendarCheck2 },
  { to: '/roadmap', label: 'Roadmap', icon: Route },
  { to: '/books', label: 'Books', icon: BookOpen },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme, applyTheme } = useThemeStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [canManageOrg, setCanManageOrg] = useState(false);
  const drawerTitleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    applyTheme();
    dashboardApi
      .notifications()
      .then((r) => setUnread(r.data.data.unread))
      .catch(() => undefined);
    orgsApi
      .me()
      .then((r) => {
        const role = r.data.data.membership?.role;
        setCanManageOrg(role === 'owner' || role === 'admin');
      })
      .catch(() => setCanManageOrg(false));
  }, [applyTheme]);

  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const NavItems = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-wave-600 text-white shadow-lg shadow-wave-600/20'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            )
          }
        >
          <Icon size={18} aria-hidden />
          {label}
        </NavLink>
      ))}
      {canManageOrg && (
        <NavLink
          to="/institution"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-wave-600 text-white shadow-lg shadow-wave-600/20'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            )
          }
        >
          <Building2 size={18} aria-hidden />
          Institution
        </NavLink>
      )}
      {user?.role === 'admin' && (
        <NavLink
          to="/admin"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            )
          }
        >
          <Shield size={18} aria-hidden />
          Admin
        </NavLink>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 bg-wave-grid dark:bg-ink-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white/70 p-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 lg:flex" aria-label="Main navigation">
          <div className="mb-8 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-wave-600 text-white" aria-hidden>
              <MessageSquareText size={18} />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-none">Dream Wave</p>
              <p className="text-xs text-wave-600">AI</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
            <NavItems />
          </nav>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
          >
            <LogOut size={18} aria-hidden />
            Log out
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 lg:px-8">
            <button
              type="button"
              className="rounded-lg p-2 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={open}
            >
              <Menu size={20} />
            </button>
            <div className="hidden lg:block">
              <p className="text-sm text-slate-500">Welcome back</p>
              <p className="font-display text-lg font-semibold">{user?.name}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                type="button"
                className="relative rounded-xl border border-slate-200 p-2 dark:border-slate-700"
                onClick={() => navigate('/dashboard')}
                aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
                    {unread}
                  </span>
                )}
              </button>
              <Link
                to="/profile"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-wave-500 to-cyan-500 text-sm font-bold text-white"
                aria-label="Open profile"
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </Link>
            </div>
          </header>

          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <motion.button
                  type="button"
                  className="absolute inset-0 bg-black/40"
                  aria-label="Close menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setOpen(false)}
                />
                <motion.aside
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={drawerTitleId}
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white p-4 dark:bg-slate-950"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <p id={drawerTitleId} className="font-display text-lg font-bold">
                      Dream Wave AI
                    </p>
                    <button
                      ref={closeBtnRef}
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close navigation menu"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
                    <NavItems onNavigate={() => setOpen(false)} />
                  </nav>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          <main id="main-content" className="flex-1 p-4 lg:p-8" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

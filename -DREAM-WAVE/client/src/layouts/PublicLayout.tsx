import { Link, Outlet } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function PublicLayout() {
  const { theme, setTheme, applyTheme } = useThemeStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyTheme();
  }, [applyTheme, theme]);

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  const nav = (
    <>
      <a href="/#features" className="hover:text-wave-600" onClick={() => setOpen(false)}>
        Features
      </a>
      <a href="/#pricing" className="hover:text-wave-600" onClick={() => setOpen(false)}>
        Pricing
      </a>
      <a href="/#faq" className="hover:text-wave-600" onClick={() => setOpen(false)}>
        FAQ
      </a>
      <Link to="/contact" className="hover:text-wave-600" onClick={() => setOpen(false)}>
        Contact
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 bg-wave-grid text-slate-900 dark:bg-ink-950 dark:text-slate-50">
      <header className="sticky top-0 z-40 border-b border-white/30 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="font-display text-xl font-bold tracking-tight">
            Dream Wave <span className="text-wave-600">AI</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Public">
            {nav}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"
              aria-label="Toggle color theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              className="rounded-xl border border-slate-200 p-2 md:hidden dark:border-slate-700"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>
            <Link to="/login" className="btn-ghost hidden sm:inline-flex">
              Log in
            </Link>
            <Link to="/signup" className="btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Mobile menu"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              className="absolute inset-x-0 top-0 rounded-b-2xl bg-white p-4 shadow-xl dark:bg-slate-950"
            >
              <div className="mb-4 flex justify-end">
                <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-4 text-sm font-medium">{nav}</nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(value?: string | Date) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function priorityColor(priority: string) {
  if (priority === 'high') return 'text-rose-600 bg-rose-50 dark:bg-rose-950/40';
  if (priority === 'low') return 'text-slate-600 bg-slate-100 dark:bg-slate-800';
  return 'text-amber-700 bg-amber-50 dark:bg-amber-950/40';
}

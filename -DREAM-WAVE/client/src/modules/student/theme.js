/** Student Portal — blue futuristic, education focused */
export const STUDENT_THEME = {
  id: 'student',
  label: 'Student Portal',
  tagline: 'AI-powered learning universe',
  icon: '🎓',
  basePath: '/student',
  accent: '#8C7AE6',
  accent2: '#A7D8F0',
  accentLight: '#7C69DC',
  glow: 'rgba(140,122,230,0.25)',
  gradient: 'linear-gradient(135deg, #8C7AE6, #A7D8F0)',
  sidebarBg: 'var(--bg-secondary)',
  sidebarBorder: 'var(--border)',
  bg: 'var(--bg-primary)',
  text: 'var(--text-primary)',
  muted: 'var(--text-secondary)',
}

export function studentPath(segment = '') {
  if (!segment) return STUDENT_THEME.basePath
  return `${STUDENT_THEME.basePath}/${segment.replace(/^\//, '')}`
}

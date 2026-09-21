/** Company Portal — Dark + White + Blue enterprise SaaS theme */
export const COMPANY_THEME = {
  id: 'company',
  label: 'Company Portal',
  tagline: 'Hiring & workforce intelligence',
  icon: '🏢',
  basePath: '/company',
  accent: '#2563EB',
  accent2: '#1D4ED8',
  accentLight: '#60A5FA',
  glow: 'rgba(37,99,235,0.35)',
  gradient: 'linear-gradient(135deg, #0B1220, #1E3A8A 55%, #2563EB)',
  sidebarBg: '#0B1220',
  sidebarBorder: 'rgba(96,165,250,0.14)',
  bg: 'radial-gradient(ellipse at 40% 0%, #13233F 0%, #070B14 55%)',
  text: '#F8FAFC',
  muted: '#94A3B8',
  card: 'rgba(15,23,42,0.72)',
  css: {
    card: 'company-glass',
    input: 'company-input',
    btn: 'company-btn company-btn-secondary',
    btnPrimary: 'company-btn company-btn-primary',
  },
}

export function companyPath(segment = '') {
  if (!segment) return COMPANY_THEME.basePath
  return `${COMPANY_THEME.basePath}/${segment.replace(/^\//, '')}`
}

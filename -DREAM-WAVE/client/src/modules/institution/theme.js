/**
 * Institution Portal theme — professional academic (White / Navy / Blue / Emerald).
 * Independent from Student and Company portals.
 */
export const INSTITUTION_THEME = {
  id: 'institution',
  name: 'institution',
  accent: '#1E3A5F',
  accentMid: '#2563EB',
  accentLight: '#3B82F6',
  emerald: '#059669',
  emeraldSoft: '#10B981',
  bg: '#F8FAFC',
  bgSoft: '#EEF2FF',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  css: {
    card: 'inst-card',
    input: 'inst-input',
    btn: 'inst-btn',
    btnPrimary: 'inst-btn inst-btn-primary',
  },
}

export const institutionPath = (p = '') => `/institution/${String(p).replace(/^\//, '')}`.replace(/\/$/, '') || '/institution'

import api from '@shared/services/api'

const crud = (base) => ({
  list: (params) => api.get(base, { params }),
  create: (data) => api.post(base, data),
  update: (id, data) => api.put(`${base}/${id}`, data),
  delete: (id) => api.delete(`${base}/${id}`),
})

/**
 * Institution-local API client (independent module surface).
 * Uses shared HTTP client for JWT/cookies only — does not alter auth flows.
 */
export const institutionService = {
  publicList: (params) => api.get('/institution/public', { params }),
  publicFilters: () => api.get('/institution/public/filters'),
  publicCompare: (ids) => api.get('/institution/public/compare', { params: { ids: Array.isArray(ids) ? ids.join(',') : ids } }),
  publicProfile: (slug) => api.get(`/institution/public/${slug}`),
  publicInsights: (slug) => api.get(`/institution/public/${slug}/insights`),
  publicTrack: (slug, type) => api.post(`/institution/public/${slug}/track`, { type }),
  publicContact: (slug, data) => api.post(`/institution/public/${slug}/contact`, data),
  inquiries: () => api.get('/institution/inquiries'),
  reports: () => api.get('/institution/reports'),
  analytics: () => api.get('/institution/analytics'),
  dashboard: () => api.get('/institution/dashboard'),
  getMine: () => api.get('/institution/me'),
  updateMine: (data) => api.put('/institution/me', data),
  bootstrap: (data) => api.post('/institution/bootstrap', data),

  departments: crud('/institution/departments'),
  courses: {
    ...crud('/institution/courses'),
    insights: (id) => api.get(`/institution/courses/${id}/insights`),
  },
  faculty: crud('/institution/faculty'),
  students: crud('/institution/students'),
  placements: crud('/institution/placements'),
  events: crud('/institution/events'),
  promotions: crud('/institution/promotions'),
  gallery: {
    list: (params) => api.get('/institution/gallery', { params }),
    create: (data) => api.post('/institution/gallery', data),
    delete: (id) => api.delete(`/institution/gallery/${id}`),
  },
  admissions: {
    ...crud('/institution/admissions'),
    updateInbound: (id, data) => api.put(`/institution/applications/${id}`, data),
  },
  certificates: {
    list: (params) => api.get('/institution/certificates', { params }),
    create: (data) => api.post('/institution/certificates', data),
    delete: (id) => api.delete(`/institution/certificates/${id}`),
  },
  scholarships: crud('/institution/scholarships'),
  research: crud('/institution/research'),
}

export default institutionService

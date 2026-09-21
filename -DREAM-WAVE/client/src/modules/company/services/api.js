import api from '@shared/services/api'

const crud = (base) => ({
  list: (params) => api.get(base, { params }),
  create: (data) => api.post(base, data),
  update: (id, data) => api.put(`${base}/${id}`, data),
  delete: (id) => api.delete(`${base}/${id}`),
})

/** Company-local API surface (JWT via shared HTTP client only). */
export const companyService = {
  bootstrap: (data) => api.post('/company/bootstrap', data),
  getMine: () => api.get('/company/me'),
  updateMine: (data) => api.put('/company/me', data),
  dashboard: () => api.get('/company/dashboard'),
  analytics: () => api.get('/company/analytics'),
  reports: () => api.get('/company/reports'),
  followers: () => api.get('/company/followers'),
  departments: crud('/company/departments'),
  jobs: crud('/company/jobs'),
  internships: crud('/company/internships'),
  employees: crud('/company/employees'),
  projects: crud('/company/projects'),
  training: crud('/company/training'),
  promotions: crud('/company/promotions'),
  events: crud('/company/events'),
  gallery: {
    list: (params) => api.get('/company/gallery', { params }),
    create: (data) => api.post('/company/gallery', data),
    delete: (id) => api.delete(`/company/gallery/${id}`),
  },
  applications: {
    list: (params) => api.get('/company/applications', { params }),
    update: (id, data) => api.put(`/company/applications/${id}`, data),
  },
  interviews: crud('/company/interviews'),
}

export default companyService

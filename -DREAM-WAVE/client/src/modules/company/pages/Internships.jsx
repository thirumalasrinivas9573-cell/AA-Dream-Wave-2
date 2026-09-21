import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

const F = [
  { key: 'title', label: 'Internship title' },
  { key: 'category', label: 'Category', default: 'General' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'duration', label: 'Duration' },
  { key: 'stipend', label: 'Stipend', type: 'number', default: 0 },
  { key: 'eligibility', label: 'Eligibility', type: 'textarea' },
  { key: 'projects', label: 'Projects', type: 'textarea' },
  { key: 'location', label: 'Location' },
  { key: 'workMode', label: 'Work mode', type: 'select', options: ['onsite', 'remote', 'hybrid'], default: 'onsite' },
  { key: 'skills', label: 'Skills (comma-separated)' },
  { key: 'certificate', label: 'Certificate', type: 'select', options: ['true', 'false'], default: 'true' },
  { key: 'conversionOpportunity', label: 'Conversion opportunity', type: 'select', options: ['true', 'false'], default: 'false' },
  { key: 'openings', label: 'Openings', type: 'number', default: 1 },
  { key: 'deadline', label: 'Deadline', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'open', 'closed'], default: 'open' },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'duration', label: 'Duration' },
  { key: 'stipend', label: 'Stipend' },
  { key: 'location', label: 'Location' },
  { key: 'applicationsCount', label: 'Apps' },
  { key: 'status', label: 'Status' },
]

const api = {
  list: companyService.internships.list,
  create: (data) => companyService.internships.create({
    ...data,
    certificate: data.certificate === true || data.certificate === 'true',
    conversionOpportunity: data.conversionOpportunity === true || data.conversionOpportunity === 'true',
    skills: typeof data.skills === 'string' ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : data.skills,
  }),
  update: (id, data) => companyService.internships.update(id, {
    ...data,
    certificate: data.certificate === true || data.certificate === 'true',
    conversionOpportunity: data.conversionOpportunity === true || data.conversionOpportunity === 'true',
    skills: typeof data.skills === 'string' ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : data.skills,
  }),
  delete: companyService.internships.delete,
}

export default function Internships() {
  return (
    <CompanyCrudPage
      title="Internships"
      subtitle="Duration, stipend, eligibility, projects, certificate, and conversion opportunity."
      api={api}
      fields={F}
      columns={C}
      emptyHint="No internships posted."
      mapRow={(r) => ({
        ...r,
        skills: Array.isArray(r.skills) ? r.skills.join(', ') : r.skills,
        certificate: r.certificate ? 'true' : 'false',
        conversionOpportunity: r.conversionOpportunity ? 'true' : 'false',
      })}
    />
  )
}

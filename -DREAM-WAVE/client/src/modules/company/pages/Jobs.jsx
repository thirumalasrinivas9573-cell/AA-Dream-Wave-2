import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

const F = [
  { key: 'title', label: 'Job title' },
  { key: 'category', label: 'Category', default: 'General' },
  { key: 'department', label: 'Department' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'responsibilities', label: 'Responsibilities', type: 'textarea' },
  { key: 'skills', label: 'Required skills (comma-separated)' },
  { key: 'experience', label: 'Experience' },
  { key: 'education', label: 'Education' },
  { key: 'location', label: 'Location' },
  { key: 'workMode', label: 'Work mode', type: 'select', options: ['onsite', 'remote', 'hybrid'], default: 'onsite' },
  { key: 'type', label: 'Employment type', type: 'select', options: ['full-time', 'part-time', 'contract', 'remote', 'graduate', 'apprenticeship', 'campus'], default: 'full-time' },
  { key: 'salaryMin', label: 'Salary min', type: 'number', default: 0 },
  { key: 'salaryMax', label: 'Salary max', type: 'number', default: 0 },
  { key: 'benefits', label: 'Benefits', type: 'textarea' },
  { key: 'hiringProcess', label: 'Hiring process', type: 'textarea' },
  { key: 'openings', label: 'Openings', type: 'number', default: 1 },
  { key: 'deadline', label: 'Application deadline', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'open', 'closed', 'filled'], default: 'open' },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
  { key: 'type', label: 'Type' },
  { key: 'workMode', label: 'Mode' },
  { key: 'location', label: 'Location' },
  { key: 'applicationsCount', label: 'Apps' },
  { key: 'status', label: 'Status' },
]

export default function Jobs() {
  return (
    <CompanyCrudPage
      title="Jobs"
      subtitle="Full-time, remote, hybrid, graduate, apprenticeship, and campus hiring posts."
      api={companyService.jobs}
      fields={F}
      columns={C}
      emptyHint="No job posts yet."
      mapRow={(r) => ({ ...r, skills: Array.isArray(r.skills) ? r.skills.join(', ') : r.skills })}
    />
  )
}

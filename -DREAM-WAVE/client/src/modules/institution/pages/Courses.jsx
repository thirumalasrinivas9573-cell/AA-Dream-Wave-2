import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'title', label: 'Course title' },
  { key: 'code', label: 'Code', required: false },
  { key: 'level', label: 'Level', type: 'select', options: ['UG', 'PG', 'Diploma', 'Certificate', 'Other'], default: 'UG' },
  { key: 'duration', label: 'Duration' },
  { key: 'fees', label: 'Fees', type: 'number', default: 0 },
  { key: 'seats', label: 'Seats', type: 'number', default: 0 },
  { key: 'eligibility', label: 'Eligibility', type: 'textarea', required: false },
  { key: 'curriculum', label: 'Curriculum', type: 'textarea', required: false },
  { key: 'futureScope', label: 'Career scope', type: 'textarea', required: false },
  { key: 'brochureUrl', label: 'Brochure URL', required: false },
  { key: 'description', label: 'Description', type: 'textarea', required: false },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'draft', 'archived'], default: 'active' },
]
const C = [
  { key: 'title', label: 'Course' },
  { key: 'code', label: 'Code' },
  { key: 'level', label: 'Level' },
  { key: 'duration', label: 'Duration' },
  { key: 'fees', label: 'Fees' },
  { key: 'status', label: 'Status' },
]

export default function Courses() {
  return (
    <InstCrudPage
      title="Courses"
      subtitle="Programs with eligibility, duration, fees, curriculum, career scope, and brochure link."
      api={institutionService.courses}
      fields={F}
      columns={C}
      emptyHint="No courses published yet."
      renderRowExtra={(row) => row.brochureUrl ? (
        <a href={row.brochureUrl} target="_blank" rel="noreferrer" className="inst-btn" style={{ marginRight: 6, textDecoration: 'none' }}>Brochure</a>
      ) : null}
    />
  )
}

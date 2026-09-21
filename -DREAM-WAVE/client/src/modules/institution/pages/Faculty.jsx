import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'designation', label: 'Designation' },
  { key: 'qualification', label: 'Qualification', required: false },
  { key: 'experience', label: 'Experience (years)', type: 'number', default: 0 },
  { key: 'subjects', label: 'Subjects (comma-separated)', required: false },
  { key: 'timetable', label: 'Timetable notes', type: 'textarea', required: false },
  { key: 'performanceNotes', label: 'Performance overview', type: 'textarea', required: false },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'on-leave', 'inactive'], default: 'active' },
]
const C = [
  { key: 'name', label: 'Name' },
  { key: 'designation', label: 'Role' },
  { key: 'email', label: 'Email' },
  { key: 'experience', label: 'Exp.' },
  { key: 'status', label: 'Status' },
]

const api = {
  ...institutionService.faculty,
  create: (data) => institutionService.faculty.create({
    ...data,
    subjects: typeof data.subjects === 'string'
      ? data.subjects.split(',').map((s) => s.trim()).filter(Boolean)
      : data.subjects,
  }),
  update: (id, data) => institutionService.faculty.update(id, {
    ...data,
    subjects: typeof data.subjects === 'string'
      ? data.subjects.split(',').map((s) => s.trim()).filter(Boolean)
      : data.subjects,
  }),
}

export default function Faculty() {
  return (
    <InstCrudPage
      title="Faculty"
      subtitle="Faculty directory — subjects, timetable notes, leave status, and performance overview."
      api={api}
      fields={F}
      columns={C}
      emptyHint="No faculty profiles yet."
    />
  )
}

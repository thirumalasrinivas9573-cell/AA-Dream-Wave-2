import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'name', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'rollNo', label: 'Roll No' },
  { key: 'year', label: 'Year / Batch' },
  { key: 'attendancePercent', label: 'Attendance %', type: 'number', default: 0 },
  { key: 'gpa', label: 'GPA / CGPA', type: 'number', default: 0 },
  { key: 'academicNotes', label: 'Academic progress', type: 'textarea', required: false },
  { key: 'performanceReport', label: 'Performance report', type: 'textarea', required: false },
  { key: 'status', label: 'Enrollment status', type: 'select', options: ['active', 'graduated', 'dropped', 'pending'], default: 'active' },
]
const C = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'rollNo', label: 'Roll' },
  { key: 'year', label: 'Year' },
  { key: 'attendancePercent', label: 'Attendance' },
  { key: 'gpa', label: 'GPA' },
  { key: 'status', label: 'Status' },
]

export default function Students() {
  return (
    <InstCrudPage
      title="Students"
      subtitle="Enrollment directory — attendance overview, academic progress, and performance notes."
      api={institutionService.students}
      fields={F}
      columns={C}
      emptyHint="No students enrolled yet. Add enrollment records here."
    />
  )
}

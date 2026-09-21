import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

const F = [
  { key: 'candidateName', label: 'Candidate name' },
  { key: 'candidateEmail', label: 'Candidate email' },
  { key: 'mode', label: 'Mode', type: 'select', options: ['online', 'offline'], default: 'online' },
  { key: 'scheduledAt', label: 'Scheduled at', type: 'datetime-local' },
  { key: 'location', label: 'Location / venue' },
  { key: 'meetingUrl', label: 'Meeting URL' },
  { key: 'notes', label: 'Interview notes', type: 'textarea' },
  { key: 'feedback', label: 'Candidate feedback', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: ['scheduled', 'completed', 'cancelled', 'no-show'], default: 'scheduled' },
]
const C = [
  { key: 'candidateName', label: 'Candidate' },
  { key: 'mode', label: 'Mode' },
  { key: 'scheduledAt', label: 'When' },
  { key: 'status', label: 'Status' },
]

export default function Interviews() {
  return (
    <CompanyCrudPage
      title="Interviews"
      subtitle="Schedule online/offline interviews, calendar entries, notes, and feedback."
      api={companyService.interviews}
      fields={F}
      columns={C}
      emptyHint="No interviews scheduled."
    />
  )
}

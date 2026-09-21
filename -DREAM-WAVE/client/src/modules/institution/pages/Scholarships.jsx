import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'title', label: 'Scholarship title' },
  { key: 'amount', label: 'Amount / benefit' },
  { key: 'eligibility', label: 'Eligibility', type: 'textarea' },
  { key: 'deadline', label: 'Deadline', type: 'date', required: false },
  { key: 'description', label: 'Description', type: 'textarea', required: false },
  { key: 'link', label: 'Apply / info URL', required: false },
  { key: 'status', label: 'Status', type: 'select', options: ['open', 'closed', 'draft'], default: 'open' },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
]

export default function Scholarships() {
  return (
    <InstCrudPage
      title="Scholarships"
      subtitle="Scholarship programs for students and Discovery promotions."
      api={institutionService.scholarships}
      fields={F}
      columns={C}
      emptyHint="No scholarships listed yet."
    />
  )
}

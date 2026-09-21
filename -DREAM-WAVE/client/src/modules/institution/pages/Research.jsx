import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'title', label: 'Research title' },
  { key: 'authors', label: 'Authors', required: false },
  { key: 'department', label: 'Department', required: false },
  { key: 'year', label: 'Year', required: false },
  { key: 'summary', label: 'Summary', type: 'textarea' },
  { key: 'url', label: 'Publication URL', required: false },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'completed', 'draft'], default: 'active' },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'authors', label: 'Authors' },
  { key: 'year', label: 'Year' },
  { key: 'status', label: 'Status' },
]

export default function Research() {
  return (
    <InstCrudPage
      title="Research"
      subtitle="Research projects and publications for your public profile."
      api={institutionService.research}
      fields={F}
      columns={C}
      emptyHint="No research entries yet."
    />
  )
}

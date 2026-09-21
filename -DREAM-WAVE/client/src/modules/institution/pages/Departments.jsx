import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'name', label: 'Department name' },
  { key: 'code', label: 'Code', required: false },
  { key: 'description', label: 'Description', type: 'textarea', required: false },
  { key: 'head', label: 'Head of department', required: false },
]
const C = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'head', label: 'HoD' },
]

export default function Departments() {
  return (
    <InstCrudPage
      title="Departments"
      subtitle="Academic departments for courses and faculty assignment."
      api={institutionService.departments}
      fields={F}
      columns={C}
      emptyHint="Create your first department."
    />
  )
}

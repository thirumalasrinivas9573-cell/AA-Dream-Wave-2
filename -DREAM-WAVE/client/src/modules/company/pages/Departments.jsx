import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

export default function Departments() {
  return (
    <CompanyCrudPage
      title="Departments"
      subtitle="Organization departments for teams and hiring."
      api={companyService.departments}
      fields={[
        { key: 'name', label: 'Department name' },
        { key: 'code', label: 'Code' },
        { key: 'head', label: 'Head' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code' },
        { key: 'head', label: 'Head' },
      ]}
      emptyHint="Create your first department."
    />
  )
}

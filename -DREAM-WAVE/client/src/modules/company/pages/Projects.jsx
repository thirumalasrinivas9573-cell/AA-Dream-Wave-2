import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

export default function Projects() {
  return (
    <CompanyCrudPage
      title="Projects"
      subtitle="Internal projects and team assignments."
      api={companyService.projects}
      fields={[
        { key: 'title', label: 'Project title' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'team', label: 'Team' },
        { key: 'status', label: 'Status', type: 'select', options: ['planned', 'active', 'completed', 'on-hold'], default: 'active' },
        { key: 'startDate', label: 'Start date', type: 'date' },
        { key: 'endDate', label: 'End date', type: 'date' },
      ]}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'team', label: 'Team' },
        { key: 'status', label: 'Status' },
      ]}
      emptyHint="No projects yet."
    />
  )
}

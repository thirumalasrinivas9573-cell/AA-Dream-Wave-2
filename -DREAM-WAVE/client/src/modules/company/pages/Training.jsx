import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

export default function Training() {
  return (
    <CompanyCrudPage
      title="Training"
      subtitle="Employee and hiring training programs."
      api={companyService.training}
      fields={[
        { key: 'title', label: 'Training title' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'audience', label: 'Audience' },
        { key: 'duration', label: 'Duration' },
        { key: 'startDate', label: 'Start date', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
      ]}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'audience', label: 'Audience' },
        { key: 'duration', label: 'Duration' },
        { key: 'status', label: 'Status' },
      ]}
      emptyHint="No training programs listed."
    />
  )
}

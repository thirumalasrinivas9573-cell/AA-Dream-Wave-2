import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'title', label: 'Event title' },
  { key: 'type', label: 'Type', type: 'select', options: ['hackathon', 'seminar', 'workshop', 'competition', 'conference', 'open-day', 'webinar', 'event', 'other'], default: 'event' },
  { key: 'venue', label: 'Venue', required: false },
  { key: 'startDate', label: 'Start date', type: 'date' },
  { key: 'endDate', label: 'End date', type: 'date', required: false },
  { key: 'description', label: 'Description', type: 'textarea', required: false },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published', 'cancelled', 'completed'], default: 'published' },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type' },
  { key: 'venue', label: 'Venue' },
  { key: 'startDate', label: 'Starts' },
  { key: 'status', label: 'Status' },
]

export default function Events() {
  return (
    <InstCrudPage
      title="Events"
      subtitle="Hackathons, seminars, workshops, competitions, conferences, and open days."
      api={institutionService.events}
      fields={F}
      columns={C}
      emptyHint="No campus events scheduled."
    />
  )
}

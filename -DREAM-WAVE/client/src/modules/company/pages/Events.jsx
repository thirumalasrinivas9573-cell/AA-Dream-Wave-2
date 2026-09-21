import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

const F = [
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type', type: 'select', options: ['hackathon', 'coding-challenge', 'hiring-drive', 'campus-recruitment', 'webinar', 'workshop', 'competition', 'announcement', 'event', 'other'], default: 'event' },
  { key: 'venue', label: 'Venue / link' },
  { key: 'startDate', label: 'Start', type: 'date' },
  { key: 'endDate', label: 'End', type: 'date' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'published', 'cancelled', 'completed'], default: 'published' },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type' },
  { key: 'startDate', label: 'Start' },
  { key: 'status', label: 'Status' },
]

export default function Events() {
  return (
    <CompanyCrudPage
      title="Events"
      subtitle="Hackathons, coding challenges, hiring drives, campus recruitment, webinars, and workshops."
      api={companyService.events}
      fields={F}
      columns={C}
      emptyHint="No career events published."
    />
  )
}

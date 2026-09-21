import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category', type: 'select', options: ['admission', 'scholarship', 'event', 'workshop', 'hackathon', 'competition', 'seminar', 'research', 'announcement', 'news', 'other'], default: 'admission' },
  { key: 'content', label: 'Content', type: 'textarea' },
  { key: 'link', label: 'Link URL', required: false },
  { key: 'image', label: 'Image URL', required: false },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'views', label: 'Views' },
]

export default function Promotions() {
  return (
    <InstCrudPage
      title="Promotions"
      subtitle="Publish admissions, scholarships, events, workshops, and more to Dream Wave Discovery."
      api={institutionService.promotions}
      fields={F}
      columns={C}
      emptyHint="No promotions yet — publish to appear in Discovery."
    />
  )
}

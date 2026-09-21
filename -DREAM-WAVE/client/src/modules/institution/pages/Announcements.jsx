import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'title', label: 'Title' },
  { key: 'content', label: 'Announcement', type: 'textarea' },
  { key: 'link', label: 'Link URL', required: false },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'views', label: 'Views' },
]

const api = {
  list: (params) => institutionService.promotions.list({ ...params, category: 'announcement' }),
  create: (data) => institutionService.promotions.create({ ...data, category: 'announcement' }),
  update: institutionService.promotions.update,
  delete: institutionService.promotions.delete,
}

export default function Announcements() {
  return (
    <InstCrudPage
      title="Announcements"
      subtitle="Official announcements for Discovery and your public profile."
      api={api}
      fields={F}
      columns={C}
      emptyHint="No announcements published."
    />
  )
}

import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'url', label: 'Video URL' },
  { key: 'caption', label: 'Caption', required: false },
  { key: 'order', label: 'Order', type: 'number', default: 0 },
]
const C = [
  { key: 'caption', label: 'Caption' },
  { key: 'url', label: 'URL' },
  { key: 'order', label: 'Order' },
]

const api = {
  list: (params) => institutionService.gallery.list({ ...params, type: 'video' }),
  create: (data) => institutionService.gallery.create({ ...data, type: 'video' }),
  delete: institutionService.gallery.delete,
}

export default function Videos() {
  return (
    <InstCrudPage
      title="Videos"
      subtitle="Campus videos shown on your public institution profile."
      api={api}
      fields={F}
      columns={C}
      emptyHint="No campus videos yet. Add hosted video URLs."
    />
  )
}

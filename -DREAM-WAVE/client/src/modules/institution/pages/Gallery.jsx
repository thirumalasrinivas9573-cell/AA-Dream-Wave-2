import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'url', label: 'Image URL' },
  { key: 'caption', label: 'Caption', required: false },
  { key: 'order', label: 'Order', type: 'number', default: 0 },
]
const C = [
  { key: 'caption', label: 'Caption' },
  { key: 'url', label: 'URL' },
  { key: 'order', label: 'Order' },
]

const api = {
  list: (params) => institutionService.gallery.list({ ...params, type: 'image' }),
  create: (data) => institutionService.gallery.create({ ...data, type: 'image' }),
  delete: institutionService.gallery.delete,
}

export default function Gallery() {
  return (
    <InstCrudPage
      title="Gallery"
      subtitle="Campus images for your public profile."
      api={api}
      fields={F}
      columns={C}
      emptyHint="No campus images yet. Add licensed image URLs."
      allowCreate
    />
  )
}

import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

const api = {
  list: (params) => companyService.gallery.list({ ...params, type: 'image' }),
  create: (data) => companyService.gallery.create({ ...data, type: 'image' }),
  delete: companyService.gallery.delete,
}

export default function Gallery() {
  return (
    <CompanyCrudPage
      title="Gallery"
      subtitle="Company image gallery for the public profile."
      api={api}
      fields={[
        { key: 'url', label: 'Image URL' },
        { key: 'caption', label: 'Caption' },
        { key: 'order', label: 'Order', type: 'number', default: 0 },
      ]}
      columns={[
        { key: 'caption', label: 'Caption' },
        { key: 'url', label: 'URL' },
        { key: 'order', label: 'Order' },
      ]}
      emptyHint="No gallery images yet."
    />
  )
}

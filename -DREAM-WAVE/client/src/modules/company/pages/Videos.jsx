import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

const api = {
  list: (params) => companyService.gallery.list({ ...params, type: 'video' }),
  create: (data) => companyService.gallery.create({ ...data, type: 'video' }),
  delete: companyService.gallery.delete,
}

export default function Videos() {
  return (
    <CompanyCrudPage
      title="Videos"
      subtitle="Company videos for the public profile."
      api={api}
      fields={[
        { key: 'url', label: 'Video URL' },
        { key: 'caption', label: 'Caption' },
        { key: 'order', label: 'Order', type: 'number', default: 0 },
      ]}
      columns={[
        { key: 'caption', label: 'Caption' },
        { key: 'url', label: 'URL' },
        { key: 'order', label: 'Order' },
      ]}
      emptyHint="No videos yet."
    />
  )
}

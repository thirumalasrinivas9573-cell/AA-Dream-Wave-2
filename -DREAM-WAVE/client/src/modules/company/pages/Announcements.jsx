import CompanyCrudPage from '../components/CompanyCrudPage'
import { companyService } from '../services/api'

const api = {
  list: (params) => companyService.promotions.list({ ...params, category: 'announcement' }),
  create: (data) => companyService.promotions.create({ ...data, category: 'announcement' }),
  update: companyService.promotions.update,
  delete: companyService.promotions.delete,
}

export default function Announcements() {
  return (
    <CompanyCrudPage
      title="Announcements"
      subtitle="Company announcements published to Dream Wave Discovery."
      api={api}
      fields={[
        { key: 'title', label: 'Title' },
        { key: 'content', label: 'Content', type: 'textarea' },
        { key: 'link', label: 'Link URL' },
      ]}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'views', label: 'Views' },
      ]}
      emptyHint="No announcements yet."
    />
  )
}

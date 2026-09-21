import InstCrudPage from '../components/InstCrudPage'
import { institutionService } from '../services/api'

const F = [
  { key: 'title', label: 'Headline' },
  { key: 'content', label: 'Article', type: 'textarea' },
  { key: 'link', label: 'Link URL', required: false },
]
const C = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'views', label: 'Views' },
]

const api = {
  list: (params) => institutionService.promotions.list({ ...params, category: 'news' }),
  create: (data) => institutionService.promotions.create({ ...data, category: 'news' }),
  update: institutionService.promotions.update,
  delete: institutionService.promotions.delete,
}

export default function News() {
  return (
    <InstCrudPage
      title="News"
      subtitle="Campus news published to Dream Wave Discovery."
      api={api}
      fields={F}
      columns={C}
      emptyHint="No news articles yet."
    />
  )
}

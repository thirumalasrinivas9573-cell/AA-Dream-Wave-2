import { Link, useLocation } from 'react-router-dom'
import './status-pages.css'

const STATUS = {
  401: {
    title: 'Authentication required',
    message: 'Sign in to continue to this page.',
  },
  403: {
    title: 'Access denied',
    message: 'Your account does not have permission to access this portal.',
  },
  404: {
    title: 'Page not found',
    message: 'The requested page does not exist or has moved.',
  },
  500: {
    title: 'Something went wrong',
    message: 'The application encountered an unexpected error.',
  },
}

export default function StatusPage({ status = 500, message, actionTo = '/', actionLabel = 'Return home' }) {
  const location = useLocation()
  const content = STATUS[status] || STATUS[500]
  const detail = message || location.state?.message || content.message

  return (
    <main className="status-page" aria-labelledby="status-title">
      <section className="status-page__card">
        <p className="status-page__code">{status}</p>
        <h1 id="status-title">{content.title}</h1>
        <p>{detail}</p>
        <Link className="btn btn-primary" to={actionTo}>{actionLabel}</Link>
      </section>
    </main>
  )
}

import { Component } from 'react'
import '../pages/status-pages.css'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production you'd send this to Sentry / LogRocket
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="status-page" aria-labelledby="fatal-error-title">
          <section className="status-page__card">
            <p className="status-page__code">500</p>
            <h1 id="fatal-error-title">Something went wrong</h1>
            <p>An unexpected error occurred. Try again or refresh the page.</p>
            <div className="status-page__actions">
            <button
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            </div>
          {import.meta.env.DEV && (
            <details className="status-page__details">
              <summary>
                Error details (dev only)
              </summary>
              <pre>{this.state.error?.stack}</pre>
            </details>
          )}
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

import { useEffect, useId, useRef } from 'react'
import './shared-ui.css'

export function Card({ as: Component = 'section', className = '', children, ...props }) {
  return <Component className={`ui-card ${className}`.trim()} {...props}>{children}</Component>
}

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`btn btn-${variant} ${className}`.trim()} {...props} />
}

export function FormField({ label, error, hint, children, required = false, className = '' }) {
  const id = useId()
  return (
    <div className={`ui-field ${className}`.trim()}>
      <label id={`${id}-label`}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <small>{hint}</small>}
      {error && <small className="ui-field__error" role="alert">{error}</small>}
    </div>
  )
}

export function DataTable({ columns, rows, rowKey = 'id', caption }) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Dialog({ open, title, description, onClose, children, actions }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const dialog = dialogRef.current
    dialog?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('ui-dialog-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('ui-dialog-open')
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="ui-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section
        ref={dialogRef}
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex="-1"
      >
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <Button variant="ghost" className="btn-icon" aria-label="Close dialog" onClick={onClose}>×</Button>
        </header>
        <div className="ui-dialog__body">{children}</div>
        {actions && <footer>{actions}</footer>}
      </section>
    </div>
  )
}

export function LoadingState({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="ui-state" role="status" aria-live="polite">
      <span>{label}</span>
      {Array.from({ length: rows }, (_, index) => <div className="skeleton ui-state__skeleton" key={index} />)}
    </div>
  )
}

export function ErrorState({ title = 'Unable to load', message, onRetry }) {
  return (
    <div className="ui-state" role="alert">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  )
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="ui-state">
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  )
}

import { Page } from 'react-pdf'

export function ReaderToolbar({
  title, page, pages, percent, zoom, dark, search, onSearch, onPage, onZoom,
  onDark, onFullscreen, onBookmark, onPanel,
}) {
  return (
    <header className="reader-toolbar">
      <div className="reader-toolbar__title"><strong>{title}</strong><span>Page {page}{pages ? ` of ${pages}` : ''} · {percent}%</span></div>
      <div className="reader-toolbar__search">
        <span aria-hidden>⌕</span>
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search this page" aria-label="Search PDF text on current page" />
      </div>
      <nav aria-label="PDF navigation">
        <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">←</button>
        <input type="number" min="1" max={pages || undefined} value={page} onChange={(event) => onPage(Number(event.target.value) || 1)} aria-label="Page number" />
        <button type="button" onClick={() => onPage(page + 1)} disabled={pages > 0 && page >= pages} aria-label="Next page">→</button>
      </nav>
      <div className="reader-toolbar__actions">
        <button type="button" onClick={() => onZoom(-10)} aria-label="Zoom out">−</button><span>{zoom}%</span><button type="button" onClick={() => onZoom(10)} aria-label="Zoom in">+</button>
        <button type="button" onClick={onBookmark}>Bookmark</button>
        <button type="button" onClick={onDark}>{dark ? 'Light' : 'Dark'}</button>
        <button type="button" onClick={onFullscreen}>Fullscreen</button>
        <button type="button" onClick={onPanel}>Tools</button>
      </div>
    </header>
  )
}

export function ThumbnailRail({ pages, page, onPage }) {
  const total = pages || 1
  const start = Math.max(1, Math.min(total - 11, page - 5))
  const numbers = Array.from({ length: Math.min(12, total) }, (_, index) => start + index)
  return (
    <div className="reader-thumbnails" aria-label="Page thumbnails">
      {numbers.map((number) => (
        <button type="button" className={page === number ? 'is-active' : ''} onClick={() => onPage(number)} key={number} aria-label={`Go to page ${number}`}>
          <Page pageNumber={number} width={108} renderTextLayer={false} renderAnnotationLayer={false} loading={<span>p.{number}</span>} />
          <small>Page {number}</small>
        </button>
      ))}
      {pages > numbers.length && <p>Showing pages {numbers[0]}–{numbers[numbers.length - 1]} of {pages}.</p>}
    </div>
  )
}

export function AnnotationPanel({
  page, annotations, draft, onDraft, onCreate, onDelete, onGoPage, signedIn,
}) {
  const selected = () => String(window.getSelection?.() || '').trim()
  const pageItems = annotations.filter((item) => item.page === page)
  const createFromSelection = (type) => {
    const text = selected()
    if (!text) return onCreate({ type, page, text: draft.text })
    return onCreate({ type, page, text, anchor: { exact: text } })
  }
  return (
    <div className="reader-annotations">
      {!signedIn && <div className="reader-signin-note">Sign in as a student to save progress and annotations.</div>}
      <section>
        <h3>Text annotations</h3>
        <p>Select text in the PDF or paste a quote below.</p>
        <textarea value={draft.text} onChange={(event) => onDraft({ ...draft, text: event.target.value })} placeholder="Selected text or quote" disabled={!signedIn} />
        <div className="reader-annotation-actions">
          <button type="button" onClick={() => createFromSelection('highlight')} disabled={!signedIn}>Highlight</button>
          <button type="button" onClick={() => createFromSelection('underline')} disabled={!signedIn}>Underline</button>
          <button type="button" onClick={() => createFromSelection('quote')} disabled={!signedIn}>Save quote</button>
        </div>
      </section>
      <section>
        <h3>Page note</h3>
        <textarea value={draft.content} onChange={(event) => onDraft({ ...draft, content: event.target.value })} placeholder="Write your note" disabled={!signedIn} />
        <input value={draft.tags} onChange={(event) => onDraft({ ...draft, tags: event.target.value })} placeholder="Page tags, comma separated" disabled={!signedIn} />
        <div className="reader-annotation-actions">
          <button type="button" onClick={() => onCreate({ type: 'note', page, content: draft.content, tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean) })} disabled={!signedIn || !draft.content.trim()}>Save note</button>
          <button type="button" onClick={() => onCreate({ type: 'page-tag', page, label: `Page ${page}`, tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean) })} disabled={!signedIn || !draft.tags.trim()}>Tag page</button>
        </div>
      </section>
      <section>
        <h3>On this page</h3>
        {!pageItems.length && <p>No annotations on page {page}.</p>}
        {pageItems.map((item) => (
          <article className={`reader-annotation reader-annotation--${item.type}`} key={item._id}>
            <button type="button" onClick={() => onGoPage(item.page)}><strong>{item.type}</strong> · p.{item.page}</button>
            <p>{item.content || item.text || item.label || item.tags?.join(', ')}</p>
            <button type="button" onClick={() => onDelete(item)} aria-label={`Delete ${item.type}`}>×</button>
          </article>
        ))}
      </section>
    </div>
  )
}

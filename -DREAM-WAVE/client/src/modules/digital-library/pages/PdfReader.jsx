import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { libraryApi } from '@shared/services/api'
import { useAuth } from '@shared/context/AuthContext'
import { AnnotationPanel, ReaderToolbar, ThumbnailRail } from '../components/ReaderComponents'
import { KnowledgeTools } from '../components/LibraryIntelligence'
import ReadingAssistantPanel from '../components/ReadingAssistantPanel'
import { LibraryState } from '../components/LibraryWorkspace'
import '../styles/library.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default function PdfReader() {
  const { id } = useParams()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const fromStudent = searchParams.get('from') === 'student'
  const [book, setBook] = useState(null)
  const [progress, setProgress] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(0)
  const [pdf, setPdf] = useState(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [zoom, setZoom] = useState(100)
  const [dark, setDark] = useState(false)
  const [panel, setPanel] = useState('annotations')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [draft, setDraft] = useState({ text: '', content: '', tags: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [indexing, setIndexing] = useState(false)
  const [showAssistant, setShowAssistant] = useState(false)
  const readerRef = useRef(null)
  const pageRef = useRef(1)
  const startPageRef = useRef(1)
  const startedAtRef = useRef(Date.now())
  const sessionIdRef = useRef(`read-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    setLoading(true)
    setError('')
    const requests = [libraryApi.get(id)]
    if (user) requests.push(libraryApi.progress(id), libraryApi.annotations(id))
    Promise.allSettled(requests).then((results) => {
      if (results[0].status === 'rejected') {
        setError(results[0].reason.userMessage || 'This book is unavailable.')
        return
      }
      setBook(results[0].value.data.book)
      if (results[1]?.status === 'fulfilled') {
        const nextProgress = results[1].value.data.progress
        setProgress(nextProgress)
        setPage(nextProgress.currentPage || 1)
        pageRef.current = nextProgress.currentPage || 1
        startPageRef.current = nextProgress.currentPage || 1
      }
      if (results[2]?.status === 'fulfilled') setAnnotations(results[2].value.data.items || [])
    }).finally(() => setLoading(false))
  }, [id, user])

  useEffect(() => {
    if (!user) {
      setPdfUrl('')
      setError('Sign in to access licensed reading content.')
      return undefined
    }
    let objectUrl = ''
    let cancelled = false
    libraryApi.pdf(id)
      .then((response) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(response.data)
        setPdfUrl(objectUrl)
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.userMessage || 'The PDF could not be loaded.')
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, user])

  const recordSession = useCallback(() => {
    if (!user) return
    const endedAt = Date.now()
    const seconds = Math.floor((endedAt - startedAtRef.current) / 1000)
    if (seconds < 15) return
    libraryApi.recordSession(id, {
      clientEventId: sessionIdRef.current,
      startedAt: new Date(startedAtRef.current).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      durationSeconds: seconds,
      startPage: startPageRef.current,
      endPage: pageRef.current,
      pagesRead: Math.abs(pageRef.current - startPageRef.current),
    }).catch(() => {})
  }, [id, user])

  useEffect(() => {
    const onPageHide = () => recordSession()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      recordSession()
    }
  }, [recordSession])

  useEffect(() => {
    if (!user || !pages) return undefined
    const timeout = setTimeout(() => {
      libraryApi.saveProgress(id, {
        currentPage: page,
        totalPages: pages,
        percent: Math.round(page / pages * 100),
      }).then((response) => setProgress(response.data.progress)).catch(() => {})
    }, 600)
    return () => clearTimeout(timeout)
  }, [id, page, pages, user])

  useEffect(() => {
    const query = search.trim()
    if (!pdf || query.length < 2) {
      setSearchResults([])
      return undefined
    }
    let cancelled = false
    const timeout = setTimeout(async () => {
      setSearching(true)
      const found = []
      for (let number = 1; number <= pdf.numPages; number += 1) {
        if (cancelled) return
        const pdfPage = await pdf.getPage(number)
        const content = await pdfPage.getTextContent()
        const text = content.items.map((item) => item.str).join(' ')
        const lower = text.toLowerCase()
        const index = lower.indexOf(query.toLowerCase())
        if (index >= 0) found.push({ page: number, excerpt: text.slice(Math.max(0, index - 45), index + query.length + 70) })
      }
      if (!cancelled) {
        setSearchResults(found)
        setSearching(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [pdf, search])

  const indexDocument = useCallback(async () => {
    if (!pdf || !user) return
    setIndexing(true)
    setMessage('Indexing document for AI reading assistant…')
    try {
      const pages = []
      for (let number = 1; number <= Math.min(pdf.numPages, 80); number += 1) {
        const pdfPage = await pdf.getPage(number)
        const content = await pdfPage.getTextContent()
        const text = content.items.map((item) => item.str).join(' ')
        if (text.trim().length > 30) pages.push({ page: number, text })
      }
      await libraryApi.indexDocument(id, pages)
      setMessage(`Indexed ${pages.length} pages for grounded reading assistance.`)
    } catch {
      setMessage('Document indexing failed. You can still read and annotate.')
    } finally {
      setIndexing(false)
    }
  }, [pdf, user, id])

  useEffect(() => {
    if (!pdf || !user || !pdf.numPages) return
    libraryApi.documentStatus(id).then((r) => {
      if (r.data.processing?.status !== 'ready') indexDocument()
    }).catch(() => indexDocument())
  }, [pdf, user, id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target.matches('input, textarea, select')) return
      if (event.key === 'ArrowRight' || event.key === 'PageDown') goPage(pageRef.current + 1)
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') goPage(pageRef.current - 1)
      if (event.key.toLowerCase() === 'b') createAnnotation({ type: 'bookmark', page: pageRef.current, label: `Page ${pageRef.current}` })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const totalPages = pages || book?.pages || progress?.totalPages || 0
  const percent = totalPages ? Math.min(100, Math.round(page / totalPages * 100)) : progress?.percent || 0
  function goPage(number) {
    const next = Math.max(1, Math.min(totalPages || number, number))
    pageRef.current = next
    setPage(next)
  }

  async function createAnnotation(payload) {
    if (!user) {
      setMessage('Sign in to save annotations.')
      return
    }
    if (!payload.text && !payload.content && !payload.label && !payload.tags?.length) {
      setMessage('Select or enter content first.')
      return
    }
    try {
      const response = await libraryApi.createAnnotation(id, payload)
      setAnnotations((current) => [...current, response.data.item])
      setDraft({ text: '', content: '', tags: '' })
      setMessage(`${payload.type} saved`)
    } catch (requestError) {
      setMessage(requestError.userMessage || 'Could not save annotation.')
    }
  }

  async function deleteAnnotation(item) {
    try {
      await libraryApi.deleteAnnotation(id, item._id)
      setAnnotations((current) => current.filter((annotation) => annotation._id !== item._id))
    } catch (requestError) {
      setMessage(requestError.userMessage || 'Could not delete annotation.')
    }
  }

  const textRenderer = useCallback(({ str }) => {
    let safe = escapeHtml(str)
    annotations
      .filter((item) => item.page === page && ['highlight', 'underline'].includes(item.type) && item.text)
      .forEach((item) => {
        const exact = escapeHtml(item.text)
        safe = safe.replace(new RegExp(`(${escapeRegex(exact)})`, 'gi'), `<mark class="reader-saved-${item.type}">$1</mark>`)
      })
    if (search.trim()) safe = safe.replace(new RegExp(`(${escapeRegex(escapeHtml(search.trim()))})`, 'gi'), '<mark>$1</mark>')
    return safe
  }, [annotations, page, search])

  if (loading) return <div className="library-module"><div className="library-shell"><div className="reader-loading" role="status">Preparing reader…</div></div></div>
  if (error || !book) return <div className="library-module"><div className="library-shell"><LibraryState title="Reader unavailable" message={error || 'This legal source could not be loaded.'} action={<Link className="library-btn library-btn-secondary" to="/library">Back to library</Link>} /></div></div>

  return (
    <div className={`library-module library-reader ${dark ? 'is-dark' : ''}`} ref={readerRef}>
      <div className="reader-topline">
        <Link to={fromStudent ? '/student/books' : `/library/books/${id}`}>{fromStudent ? '← Books' : '← Book details'}</Link>
        {message && <span role="status">{message}</span>}
      </div>
      <ReaderToolbar
        title={book.title}
        page={page}
        pages={totalPages}
        percent={percent}
        zoom={zoom}
        dark={dark}
        search={search}
        onSearch={setSearch}
        onPage={goPage}
        onZoom={(delta) => setZoom((current) => Math.max(50, Math.min(200, current + delta)))}
        onDark={() => setDark((current) => !current)}
        onFullscreen={() => document.fullscreenElement ? document.exitFullscreen?.() : readerRef.current?.requestFullscreen?.()}
        onBookmark={() => createAnnotation({ type: 'bookmark', page, label: `Page ${page}` })}
        onPanel={() => setPanel((current) => current ? '' : 'annotations')}
      />
      <div className="reader-progress" aria-label={`${percent} percent complete`}><i style={{ width: `${percent}%` }} /></div>
      <div className={`reader-workspace ${panel ? '' : 'reader-workspace--closed'}`}>
        {panel && (
          <aside className="reader-sidebar">
            <nav aria-label="Reader tools">
              {['annotations', 'thumbnails', 'search', 'knowledge'].map((item) => <button type="button" className={panel === item ? 'is-active' : ''} onClick={() => setPanel(item)} key={item}>{item}</button>)}
            </nav>
            {panel === 'annotations' && <AnnotationPanel page={page} annotations={annotations} draft={draft} onDraft={setDraft} onCreate={createAnnotation} onDelete={deleteAnnotation} onGoPage={goPage} signedIn={Boolean(user)} />}
            {panel === 'thumbnails' && <ThumbnailRail pages={totalPages} page={page} onPage={goPage} />}
            {panel === 'search' && (
              <section className="reader-search-results">
                <h3>{searching ? 'Searching…' : `${searchResults.length} page matches`}</h3>
                {!search.trim() && <p>Search the complete document from the toolbar.</p>}
                {searchResults.map((result) => <button type="button" onClick={() => goPage(result.page)} key={result.page}><strong>Page {result.page}</strong><span>…{result.excerpt}…</span></button>)}
              </section>
            )}
            {panel === 'knowledge' && (
              <>
                <KnowledgeTools book={book} currentPage={page} onResult={({ mode }) => setShowAssistant(mode === 'assistant')} />
                {showAssistant && <ReadingAssistantPanel bookId={id} currentPage={page} />}
                {!indexing && <button type="button" className="library-btn library-btn-secondary" onClick={indexDocument}>Re-index document</button>}
              </>
            )}
          </aside>
        )}
        <main className="reader-document" aria-label={`PDF reader for ${book.title}`}>
          <Document
            file={pdfUrl}
            onLoadSuccess={(document) => {
              setPdf(document)
              setPages(document.numPages)
              if (pageRef.current > document.numPages) goPage(document.numPages)
            }}
            onLoadError={(loadError) => setError(loadError.message || 'PDF could not be loaded.')}
            loading={<div className="reader-loading">Loading optimized PDF…</div>}
            error={<div className="reader-pdf-error"><h2>PDF preview unavailable</h2><p>The legal source may block embedded viewing.</p>{book.license?.sourceUrl && <a href={book.license.sourceUrl} target="_blank" rel="noreferrer" className="library-btn library-btn-primary">Open legal source</a>}</div>}
          >
            <Page
              pageNumber={page}
              width={Math.round(760 * zoom / 100)}
              customTextRenderer={textRenderer}
              renderAnnotationLayer
              renderTextLayer
              loading={<div className="reader-loading">Rendering page {page}…</div>}
            />
          </Document>
        </main>
      </div>
    </div>
  )
}

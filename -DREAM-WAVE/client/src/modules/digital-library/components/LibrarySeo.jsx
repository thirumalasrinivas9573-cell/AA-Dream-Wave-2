import { useEffect } from 'react'

export default function LibrarySeo({ title, description, canonical }) {
  useEffect(() => {
    const prev = document.title
    if (title) document.title = title
    let meta = document.head.querySelector('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    if (description) meta.setAttribute('content', description)
    let link = document.head.querySelector('link[rel="canonical"]')
    if (canonical) {
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', `${window.location.origin}${canonical}`)
    }
    return () => { document.title = prev }
  }, [title, description, canonical])
  return null
}

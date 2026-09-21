import { useEffect } from 'react'

/** Document title, meta, OG/Twitter, canonical, JSON-LD for public company pages. */
export default function SeoHead({
  title,
  description,
  canonical,
  image,
  jsonLd,
  type = 'website',
}) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) document.title = title

    const upsert = (attr, key, content) => {
      if (!content) return
      let el = document.head.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }

    upsert('name', 'description', description)
    upsert('property', 'og:title', title)
    upsert('property', 'og:description', description)
    upsert('property', 'og:type', type)
    upsert('property', 'og:url', canonical ? `${window.location.origin}${canonical}` : window.location.href)
    if (image) upsert('property', 'og:image', image)
    upsert('name', 'twitter:card', image ? 'summary_large_image' : 'summary')
    upsert('name', 'twitter:title', title)
    upsert('name', 'twitter:description', description)
    if (image) upsert('name', 'twitter:image', image)

    let link = document.head.querySelector('link[rel="canonical"]')
    if (canonical) {
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', `${window.location.origin}${canonical}`)
    }

    let script = document.getElementById('dw-company-jsonld')
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script')
        script.id = 'dw-company-jsonld'
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(jsonLd)
    }

    return () => {
      document.title = prevTitle
      if (script) script.textContent = ''
    }
  }, [title, description, canonical, image, jsonLd, type])

  return null
}

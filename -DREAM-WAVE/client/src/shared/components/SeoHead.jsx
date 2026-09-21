import { useEffect } from 'react'

export default function SeoHead({ title, description, image, canonical, robots = 'index,follow', jsonLd }) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    const setMeta = (selector, attributes) => {
      let element = document.head.querySelector(selector)
      if (!element) {
        element = document.createElement('meta')
        document.head.appendChild(element)
      }
      Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value || ''))
    }
    setMeta('meta[name="description"]', { name: 'description', content: description })
    setMeta('meta[name="robots"]', { name: 'robots', content: robots })
    setMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description })
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'profile' })
    if (image) setMeta('meta[property="og:image"]', { property: 'og:image', content: image })
    let canonicalLink = document.head.querySelector('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.rel = 'canonical'
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.href = new URL(canonical, window.location.origin).toString()
    let script
    if (jsonLd) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.dreamWaveSeo = 'true'
      script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c')
      document.head.appendChild(script)
    }
    return () => {
      document.title = previousTitle
      script?.remove()
    }
  }, [canonical, description, image, jsonLd, robots, title])
  return null
}

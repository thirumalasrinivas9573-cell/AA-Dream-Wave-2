export function safeExternalUrl(value, { allowMail = false, allowRelative = false } = {}) {
  const input = String(value || '').trim()
  if (!input) return ''
  if (allowRelative && input.startsWith('/') && !input.startsWith('//')) return input
  try {
    const url = new URL(input)
    const protocols = allowMail ? ['https:', 'http:', 'mailto:'] : ['https:', 'http:']
    return protocols.includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

export function openBlob(blob, filename = '') {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  if (filename) link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

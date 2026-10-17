/**
 * Triggers a browser download for a Blob payload and handles Blob error parsing.
 */

export function downloadBlob(blobData, filename = 'download') {
  const blob = blobData instanceof Blob ? blobData : new Blob([blobData])
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function parseBlobError(err, fallbackMessage = 'Download failed.') {
  if (err?.response?.data instanceof Blob) {
    try {
      const text = await err.response.data.text()
      const json = JSON.parse(text)
      return json.message || json.code || fallbackMessage
    } catch {
      return fallbackMessage
    }
  }
  return err?.userMessage || err?.message || fallbackMessage
}

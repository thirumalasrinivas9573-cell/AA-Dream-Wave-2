import { useCallback, useState } from 'react'
import { downloadBlob } from '@shared/utils/downloadBlob'

/**
 * Truly lazy PDF export hook.
 * Dynamically imports @react-pdf/renderer and document components ONLY when export is triggered.
 */
export function usePdfExport() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const exportPdf = useCallback(async (docBuilder, filename = 'document.pdf') => {
    if (!docBuilder) {
      setError('No document builder available to export.')
      return { success: false, error: 'No document builder available to export.' }
    }

    setExporting(true)
    setError('')
    setNotice('')

    let originalError = null
    let safeModeError = null
    let registeredFonts = null
    let recovered = false

    try {
      // 1. Register fonts first so style definitions and document components receive the resolved font family
      const { registerPdfFonts, REGISTERED_FONTS } = await import('@shared/pdf/fonts')
      registeredFonts = await registerPdfFonts()

      // 1.5. Install fontkit runtime guard for null-safe GPOS mark positioning
      const { installFontkitGuard } = await import('@shared/pdf/fontkitGuard')
      await installFontkitGuard()

      // 2. Truly lazy load @react-pdf/renderer only after font registration resolves
      const { pdf } = await import('@react-pdf/renderer')

      // 3. Resolve document element (supports async function returning <Document />, passing safeMode: false initially)
      let docElement = typeof docBuilder === 'function' ? await docBuilder({ safeMode: false }) : docBuilder

      if (!docElement) {
        throw new Error('PDF document element failed to render.')
      }

      let blob
      try {
        const instance = pdf(docElement)
        blob = await instance.toBlob()
      } catch (firstErr) {
        originalError = firstErr
        console.error('[PDF Export] Original render error:', firstErr)

        // Retry once with safeMode: true (rebuilding the document)
        if (typeof docBuilder === 'function') {
          try {
            docElement = await docBuilder({ safeMode: true })
            const safeInstance = pdf(docElement)
            blob = await safeInstance.toBlob()
            recovered = true
            // Set non-blocking notice ONLY when safe mode successfully produced the PDF
            setNotice("Some characters couldn't be displayed in the PDF.")
          } catch (retryErr) {
            safeModeError = retryErr
            console.error('[PDF Export] Safe mode retry error:', retryErr)
            throw retryErr
          }
        } else {
          throw firstErr
        }
      }

      // Trigger client-side file download
      if (blob) {
        downloadBlob(blob, filename)
      }

      return {
        success: true,
        recovered,
        originalError,
        safeModeError,
        registeredFonts: registeredFonts || REGISTERED_FONTS,
      }
    } catch (err) {
      const message = err?.message || 'Failed to generate PDF document.'
      setError(message)
      return {
        success: false,
        recovered: false,
        originalError: originalError || err,
        safeModeError: safeModeError || (originalError ? err : null),
        registeredFonts,
      }
    } finally {
      setExporting(false)
    }
  }, [])

  return {
    exporting,
    error,
    setError,
    notice,
    setNotice,
    exportPdf,
  }
}


export default usePdfExport


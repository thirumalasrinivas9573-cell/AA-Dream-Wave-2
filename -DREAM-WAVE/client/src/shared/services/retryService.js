const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function withRetry(loader, { retries = 2, baseDelay = 300, signal } = {}) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
    try {
      return await loader()
    } catch (error) {
      lastError = error
      const retryable = error.isNetworkError || error.response?.status >= 500 || error.code === 'ECONNABORTED'
      if (!retryable || attempt === retries) throw error
      await wait(baseDelay * (2 ** attempt))
    }
  }
  throw lastError
}

export function connectionState() {
  return typeof navigator === 'undefined' || navigator.onLine !== false ? 'online' : 'offline'
}

// Small retry helper for transient LLM/API failures (rate limits, 5xx,
// network blips). Keeps the content pipeline from failing on a single hiccup.

type RetryOptions = {
  retries?: number
  baseDelayMs?: number
}

const RETRYABLE_STATUS = [408, 409, 425, 429, 500, 502, 503, 504]

function isRetryable(err: unknown): boolean {
  const message = (err as Error)?.message?.toLowerCase() ?? ''

  // Quota/billing exhaustion won't recover within a short backoff window
  // (the provider hands back a long retry delay), so fail fast with a clear
  // message instead of hammering the API.
  if (/quota|resource_exhausted|billing|exceeded your current quota/.test(message)) {
    return false
  }

  const status = (err as { status?: number; statusCode?: number })?.status ??
    (err as { statusCode?: number })?.statusCode
  if (status && RETRYABLE_STATUS.includes(status)) return true

  return /timeout|fetch failed|network|econnreset|socket|overloaded|unavailable|temporarily|rate limit|too many requests|\b429\b|\b503\b/.test(
    message
  )
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 3
  const baseDelay = options.baseDelayMs ?? 500

  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt === retries || !isRetryable(err)) break
      // Exponential backoff with jitter: ~0.5s, 1s, 2s (+ up to 250ms).
      const delay = baseDelay * 2 ** attempt + Math.random() * 250
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastErr
}

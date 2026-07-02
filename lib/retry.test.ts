import { describe, it, expect, vi } from 'vitest'
import { withRetry } from './retry'

describe('withRetry', () => {
  it('returns the result on first success without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on a retryable status code and eventually succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 429, message: 'rate limited' })
      .mockResolvedValueOnce('ok')
    const result = await withRetry(fn, { baseDelayMs: 1 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on a network-ish error message', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fetch failed: ECONNRESET'))
      .mockResolvedValueOnce('ok')
    const result = await withRetry(fn, { baseDelayMs: 1 })
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not retry a quota/billing error and fails fast', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Resource exhausted: quota exceeded'))
    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toThrow(/quota/i)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('gives up after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 503, message: 'unavailable' })
    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toBeTruthy()
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('does not retry a non-retryable error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('invalid api key'))
    await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toThrow(/invalid api key/)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

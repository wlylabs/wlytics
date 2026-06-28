import { GoogleGenerativeAI } from '@google/generative-ai'
import { withRetry } from '@/lib/retry'

// gemini-2.5-flash has a much larger free tier than the newest 3.5-flash
// (gemini-flash-latest), so it runs reliably as the fallback. Override via
// GEMINI_MODEL if you prefer another version.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Multiple keys can be set comma-separated to rotate and multiply free quota.
function getKeys(): string[] {
  return (process.env.GEMINI_API_KEY ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

const clientCache = new Map<string, GoogleGenerativeAI>()
function clientFor(key: string): GoogleGenerativeAI {
  let c = clientCache.get(key)
  if (!c) {
    c = new GoogleGenerativeAI(key)
    clientCache.set(key, c)
  }
  return c
}

let rotationIndex = 0

function looksRateLimited(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  const msg = (err as Error)?.message?.toLowerCase() ?? ''
  return status === 429 || /quota|resource_exhausted|rate limit|too many requests/.test(msg)
}

async function withKeyRotation<T>(fn: (client: GoogleGenerativeAI) => Promise<T>): Promise<T> {
  const keys = getKeys()
  if (keys.length === 0) {
    throw new Error('GEMINI_API_KEY belum diset di environment (.env.local)')
  }
  let lastErr: unknown
  for (let i = 0; i < keys.length; i++) {
    const idx = (rotationIndex + i) % keys.length
    try {
      const result = await fn(clientFor(keys[idx]))
      rotationIndex = (idx + 1) % keys.length
      return result
    } catch (err) {
      lastErr = err
      if (!looksRateLimited(err)) throw err
    }
  }
  throw lastErr
}

// Turn verbose SDK errors into short, actionable messages for the UI.
function friendlyError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err)

  if (/quota|resource_exhausted|exceeded your current quota|429|too many requests/i.test(raw)) {
    const m = raw.match(/retry in ([\d.]+)s/i) ?? raw.match(/"retryDelay":\s*"(\d+)s"/i)
    const wait = m ? ` Coba lagi dalam ~${Math.ceil(parseFloat(m[1]))} detik.` : ''
    return new Error(
      `Kuota Gemini tercapai (rate limit free tier).${wait} Tunggu sebentar lalu coba lagi, ganti GEMINI_MODEL (mis. gemini-2.0-flash), atau aktifkan billing di Google AI Studio.`
    )
  }
  if (/api[_ ]?key|api_key_invalid|invalid.*key|permission denied/i.test(raw)) {
    return new Error('GEMINI_API_KEY tidak valid atau tidak punya akses. Periksa kembali key di environment.')
  }
  if (/not found|is not supported|unsupported|no longer available/i.test(raw) && /model/i.test(raw)) {
    return new Error(`Model Gemini "${MODEL}" tidak tersedia. Set GEMINI_MODEL ke model lain (mis. gemini-2.0-flash).`)
  }
  return new Error(`Gemini error: ${raw.split('\n')[0].slice(0, 200)}`)
}

export async function geminiComplete(prompt: string): Promise<string> {
  try {
    return await withRetry(() =>
      withKeyRotation(async (client) => {
        const model = client.getGenerativeModel({ model: MODEL })
        const result = await model.generateContent(prompt)
        return result.response.text()
      })
    )
  } catch (err) {
    throw friendlyError(err)
  }
}

export type KeyStatus = {
  configured: boolean
  available: boolean
  message: string
  remaining?: string | null
}

// Gemini doesn't expose remaining quota cheaply (you only learn the limit by
// hitting a 429 on a real call, which would burn the small free quota). So we
// only verify validity here and label it as the fallback engine.
export async function checkGeminiKey(): Promise<KeyStatus> {
  const keys = getKeys()
  if (keys.length === 0) {
    return { configured: false, available: false, message: 'Key belum diset' }
  }
  const keyNote = keys.length > 1 ? ` · ${keys.length} key` : ''
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${keys[0]}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) return { configured: true, available: true, message: `Valid (fallback)${keyNote}` }
    if (res.status === 400 || res.status === 403) {
      return { configured: true, available: false, message: 'Key tidak valid' }
    }
    return { configured: true, available: false, message: `Gemini error (HTTP ${res.status})` }
  } catch (err) {
    return {
      configured: true,
      available: false,
      message: err instanceof Error ? err.message : 'Gagal memeriksa Gemini'
    }
  }
}

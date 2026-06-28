import { GoogleGenerativeAI } from '@google/generative-ai'
import { withRetry } from '@/lib/retry'

// gemini-1.5-flash is retired. "gemini-flash-latest" always points at the
// current GA Flash model, so deprecations don't break the pipeline. Override
// via GEMINI_MODEL to pin a specific version if you prefer.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest'

let cached: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY belum diset di environment (.env.local)')
  }
  if (!cached) {
    cached = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return cached
}

// Turn verbose SDK errors into short, actionable messages for the UI.
function friendlyError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err)

  if (/quota|resource_exhausted|exceeded your current quota|429|too many requests/i.test(raw)) {
    const m = raw.match(/retry in ([\d.]+)s/i) ?? raw.match(/"retryDelay":\s*"(\d+)s"/i)
    const wait = m ? ` Coba lagi dalam ~${Math.ceil(parseFloat(m[1]))} detik.` : ''
    return new Error(
      `Kuota Gemini tercapai (rate limit free tier).${wait} Tunggu sebentar lalu coba lagi, ganti GEMINI_MODEL (mis. gemini-2.5-flash), atau aktifkan billing di Google AI Studio.`
    )
  }
  if (/api[_ ]?key|api_key_invalid|invalid.*key|permission denied/i.test(raw)) {
    return new Error('GEMINI_API_KEY tidak valid atau tidak punya akses. Periksa kembali key di environment.')
  }
  if (/not found|is not supported|unsupported|no longer available/i.test(raw) && /model/i.test(raw)) {
    return new Error(`Model Gemini "${MODEL}" tidak tersedia. Set GEMINI_MODEL ke model lain (mis. gemini-2.5-flash).`)
  }
  return new Error(`Gemini error: ${raw.split('\n')[0].slice(0, 200)}`)
}

export async function geminiComplete(prompt: string): Promise<string> {
  try {
    const model = getClient().getGenerativeModel({ model: MODEL })
    const result = await withRetry(() => model.generateContent(prompt))
    return result.response.text()
  } catch (err) {
    throw friendlyError(err)
  }
}

export type KeyStatus = { configured: boolean; ok: boolean; message: string }

// Verify the Gemini key by listing models — an auth check that does NOT spend
// the (small) generation quota.
export async function checkGeminiKey(): Promise<KeyStatus> {
  if (!process.env.GEMINI_API_KEY) {
    return { configured: false, ok: false, message: 'GEMINI_API_KEY belum diset' }
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) return { configured: true, ok: true, message: 'API key valid' }
    if (res.status === 400 || res.status === 403) {
      return { configured: true, ok: false, message: 'API key tidak valid' }
    }
    return { configured: true, ok: false, message: `Gemini error (HTTP ${res.status})` }
  } catch (err) {
    return {
      configured: true,
      ok: false,
      message: err instanceof Error ? err.message : 'Gagal memeriksa Gemini'
    }
  }
}

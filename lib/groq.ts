import Groq from 'groq-sdk'
import { withRetry } from '@/lib/retry'

// Current GroqCloud production models (Jun 2026). The older llama3-8b-8192 /
// llama-3.3-70b-versatile families are deprecated/decommissioned. Override via
// env when Groq rotates models again — no code change needed.
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const FAST_MODEL = process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b'

// Multiple keys can be set comma-separated to rotate and multiply free quota.
function getKeys(): string[] {
  return (process.env.GROQ_API_KEY ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

export function groqKeyCount(): number {
  return getKeys().length
}

const clientCache = new Map<string, Groq>()
function clientFor(key: string): Groq {
  let c = clientCache.get(key)
  if (!c) {
    c = new Groq({ apiKey: key })
    clientCache.set(key, c)
  }
  return c
}

let rotationIndex = 0

function looksRateLimited(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  const msg = (err as Error)?.message?.toLowerCase() ?? ''
  return status === 429 || /rate limit|quota|too many requests|resource_exhausted/.test(msg)
}

// Run a call across the configured keys, rotating and skipping any that are
// rate-limited. Non-rate-limit errors (auth/model) are thrown immediately
// since another key won't help.
async function withKeyRotation<T>(fn: (client: Groq) => Promise<T>): Promise<T> {
  const keys = getKeys()
  if (keys.length === 0) {
    throw new Error('GROQ_API_KEY belum diset di environment (.env.local)')
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
function friendlyError(err: unknown, model: string): Error {
  const raw = err instanceof Error ? err.message : String(err)

  if (/quota|rate limit|429|too many requests/i.test(raw)) {
    return new Error('Kuota/rate limit Groq tercapai. Tunggu sebentar lalu coba lagi.')
  }
  if (/invalid api key|401|unauthorized|authentication/i.test(raw)) {
    return new Error('GROQ_API_KEY tidak valid. Periksa kembali key di environment.')
  }
  if (/decommission|not found|does not exist|model_not_found|400/i.test(raw) && /model/i.test(raw)) {
    return new Error(`Model Groq "${model}" tidak tersedia/decommissioned. Set GROQ_MODEL / GROQ_FAST_MODEL ke model lain.`)
  }
  return new Error(`Groq error: ${raw.split('\n')[0].slice(0, 200)}`)
}

export async function groqComplete(
  prompt: string,
  model = DEFAULT_MODEL,
  maxTokens = 4096
): Promise<string> {
  try {
    const res = await withRetry(() =>
      withKeyRotation((groq) =>
        groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: maxTokens,
          // Reasoning models (gpt-oss) burn extra output tokens on reasoning,
          // which hits the per-minute output-token (OTPM) limit fast. Low
          // effort keeps quality fine for article writing and saves tokens.
          ...(model.includes('gpt-oss') ? { reasoning_effort: 'low' as const } : {})
        })
      )
    )
    return res.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw friendlyError(err, model)
  }
}

export async function groqFast(prompt: string, maxTokens = 4096): Promise<string> {
  return groqComplete(prompt, FAST_MODEL, maxTokens)
}

export type KeyStatus = {
  configured: boolean
  available: boolean
  message: string
  remaining?: string | null
}

// Probe with a 1-token completion and read Groq's rate-limit headers to report
// whether the key is currently usable (limit tersedia) or rate-limited.
export async function checkGroqKey(): Promise<KeyStatus> {
  const keys = getKeys()
  if (keys.length === 0) {
    return { configured: false, available: false, message: 'Key belum diset' }
  }
  const keyNote = keys.length > 1 ? ` · ${keys.length} key` : ''
  try {
    const { response } = await withKeyRotation((groq) =>
      groq.chat.completions
        .create({
          model: FAST_MODEL,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
        .withResponse()
    )

    const remaining = response.headers.get('x-ratelimit-remaining-requests')
    return {
      configured: true,
      available: true,
      remaining,
      message: `${remaining ? `Tersedia · ${remaining} request tersisa` : 'Tersedia'}${keyNote}`
    }
  } catch (err) {
    const status = (err as { status?: number })?.status
    const raw = err instanceof Error ? err.message : ''
    if (status === 429 || /rate limit|quota|too many requests/i.test(raw)) {
      const m = raw.match(/try again in ([\d.]+)s/i) ?? raw.match(/([\d.]+)s/)
      return {
        configured: true,
        available: false,
        message: `Limit tercapai${
          keys.length > 1 ? ` di semua ${keys.length} key` : ''
        }${m ? `, coba lagi ~${Math.ceil(parseFloat(m[1]))} detik` : ''}`
      }
    }
    return { configured: true, available: false, message: friendlyError(err, FAST_MODEL).message }
  }
}

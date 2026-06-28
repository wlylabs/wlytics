import Groq from 'groq-sdk'
import { withRetry } from '@/lib/retry'

// Current GroqCloud production models (Jun 2026). The older llama3-8b-8192 /
// llama-3.3-70b-versatile families are deprecated/decommissioned. Override via
// env when Groq rotates models again — no code change needed.
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'
const FAST_MODEL = process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b'

let cached: Groq | null = null

function getClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY belum diset di environment (.env.local)')
  }
  if (!cached) {
    cached = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return cached
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
    const groq = getClient()
    const res = await withRetry(() =>
      groq.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: maxTokens
      })
    )
    return res.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw friendlyError(err, model)
  }
}

export async function groqFast(prompt: string): Promise<string> {
  return groqComplete(prompt, FAST_MODEL)
}

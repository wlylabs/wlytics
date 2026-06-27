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

export async function groqComplete(
  prompt: string,
  model = DEFAULT_MODEL
): Promise<string> {
  const groq = getClient()
  const res = await withRetry(() =>
    groq.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096
    })
  )
  return res.choices[0]?.message?.content ?? ''
}

export async function groqFast(prompt: string): Promise<string> {
  return groqComplete(prompt, FAST_MODEL)
}

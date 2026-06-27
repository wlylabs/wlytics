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

export async function geminiComplete(prompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({ model: MODEL })
  const result = await withRetry(() => model.generateContent(prompt))
  return result.response.text()
}

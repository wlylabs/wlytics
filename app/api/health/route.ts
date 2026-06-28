import { NextResponse } from 'next/server'
import { checkGroqKey } from '@/lib/groq'
import { checkGeminiKey } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

// Reports whether the Groq and Gemini API keys are configured and valid.
// Both checks are auth-only (list models) and do not consume generation quota.
export async function GET() {
  const [groq, gemini] = await Promise.all([checkGroqKey(), checkGeminiKey()])
  return NextResponse.json({ success: true, data: { groq, gemini } })
}

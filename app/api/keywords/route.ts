import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqComplete } from '@/lib/groq'
import { PROMPTS } from '@/lib/prompts'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('keywords')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const raw = await groqComplete(PROMPTS.keyword_research())

    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Failed to parse keyword JSON from model response')

    const parsed = JSON.parse(match[0]) as Array<{
      keyword: string
      intent: string
      estimasi_artikel: string
    }>

    const rows = parsed.map((k) => ({ ...k, status: 'unused' }))

    const { data, error } = await supabaseAdmin
      .from('keywords')
      .insert(rows)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

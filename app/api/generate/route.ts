import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqComplete, groqFast } from '@/lib/groq'
import { geminiComplete } from '@/lib/gemini'
import { PROMPTS } from '@/lib/prompts'

export async function POST(req: Request) {
  try {
    const { keyword_id, keyword } = (await req.json()) as {
      keyword_id: string
      keyword: string
    }

    // 1. Mark keyword as in progress
    await supabaseAdmin
      .from('keywords')
      .update({ status: 'in_progress' })
      .eq('id', keyword_id)

    // 2. Outline
    const outline = await groqComplete(PROMPTS.generate_outline(keyword))

    // 3. Article
    const content = await geminiComplete(PROMPTS.generate_article(keyword, outline))

    // 4. Summary (first 500 chars)
    const summary = content.slice(0, 500)

    // 5. Meta
    const rawMeta = await groqFast(PROMPTS.generate_meta(keyword, summary))

    // 6. Parse meta JSON
    const match = rawMeta.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Failed to parse meta JSON from model response')

    const meta = JSON.parse(match[0]) as {
      meta_title: string
      meta_description: string
      slug: string
      tags: string[]
      kategori: string
    }

    // 7. Word count
    const word_count = content.trim().split(/\s+/).filter(Boolean).length

    // 8. Insert article
    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        keyword_id,
        keyword,
        title: meta.meta_title,
        content,
        meta_title: meta.meta_title,
        meta_description: meta.meta_description,
        slug: meta.slug,
        tags: meta.tags,
        kategori: meta.kategori,
        status: 'generated',
        word_count
      })
      .select()
      .single()

    if (error) throw error

    // 9. Mark keyword as done
    await supabaseAdmin
      .from('keywords')
      .update({ status: 'done' })
      .eq('id', keyword_id)

    // 10. Return
    return NextResponse.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

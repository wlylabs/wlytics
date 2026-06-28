import { supabaseAdmin } from '@/lib/supabase'
import { groqComplete, groqFast } from '@/lib/groq'
import { geminiComplete } from '@/lib/gemini'
import { PROMPTS } from '@/lib/prompts'
import { getArticleType } from '@/lib/articleTypes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Streams newline-delimited JSON (NDJSON) events so the client can show real
// per-step progress for the outline -> article -> meta -> save pipeline.
export async function POST(req: Request) {
  const { keyword_id, keyword, article_type } = (await req.json()) as {
    keyword_id: string
    keyword: string
    article_type?: string
  }

  const type = getArticleType(article_type)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))

      let current = 0

      try {
        // Step 1: Outline
        send({ type: 'step', index: 0, status: 'loading' })
        await supabaseAdmin
          .from('keywords')
          .update({ status: 'in_progress' })
          .eq('id', keyword_id)
        const outline = await groqComplete(PROMPTS.generate_outline(keyword, type))
        send({ type: 'step', index: 0, status: 'done' })

        // Step 2: Article. Groq is primary (more generous free tier); fall
        // back to Gemini if Groq is rate-limited / unavailable.
        current = 1
        send({ type: 'step', index: 1, status: 'loading' })
        const articlePrompt = PROMPTS.generate_article(keyword, outline, type)
        let content: string
        try {
          content = await groqComplete(articlePrompt, undefined, 8192)
        } catch (groqErr) {
          console.warn('Groq failed, falling back to Gemini:', groqErr)
          send({ type: 'notice', message: 'Groq limit/issue — beralih ke Gemini…' })
          content = await geminiComplete(articlePrompt)
        }
        send({ type: 'step', index: 1, status: 'done' })

        // Step 3: Meta
        current = 2
        send({ type: 'step', index: 2, status: 'loading' })
        const summary = content.slice(0, 500)
        const rawMeta = await groqFast(PROMPTS.generate_meta(keyword, summary))
        const match = rawMeta.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('Failed to parse meta JSON from model response')
        const meta = JSON.parse(match[0]) as {
          meta_title: string
          meta_description: string
          slug: string
          tags: string[]
          kategori: string
        }
        send({ type: 'step', index: 2, status: 'done' })

        // Step 4: Save
        current = 3
        send({ type: 'step', index: 3, status: 'loading' })
        const word_count = content.trim().split(/\s+/).filter(Boolean).length
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

        await supabaseAdmin
          .from('keywords')
          .update({ status: 'done' })
          .eq('id', keyword_id)
        send({ type: 'step', index: 3, status: 'done' })

        send({ type: 'done', data })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        send({ type: 'error', index: current, error: message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

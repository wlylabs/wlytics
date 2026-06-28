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

        // Internal links: existing published articles (WordPress or Blogger).
        const { data: publishedRows } = await supabaseAdmin
          .from('articles')
          .select('title, wp_url, blogger_url')
          .or('wp_url.not.is.null,blogger_url.not.is.null')
          .order('created_at', { ascending: false })
          .limit(15)
        const internalLinks = (publishedRows ?? [])
          .map((a) => ({ title: a.title as string, url: (a.wp_url ?? a.blogger_url) as string }))
          .filter((l) => l.title && l.url)

        // Step 2: Article. Try Groq big model, then Groq fast model (still
        // Groq quota), and only then Gemini. Surface the Groq error if all
        // fail, since Groq is the primary engine.
        current = 1
        send({ type: 'step', index: 1, status: 'loading' })
        const articlePrompt = PROMPTS.generate_article(keyword, outline, type, internalLinks)
        let content: string
        try {
          content = await groqComplete(articlePrompt, undefined, 8192)
        } catch (bigErr) {
          console.warn('Groq (large) failed:', bigErr)
          try {
            send({ type: 'notice', message: 'Model utama sibuk — pakai model cepat Groq…' })
            content = await groqFast(articlePrompt, 8192)
          } catch (fastErr) {
            console.warn('Groq (fast) failed:', fastErr)
            try {
              send({ type: 'notice', message: 'Groq limit — beralih ke Gemini…' })
              content = await geminiComplete(articlePrompt)
            } catch (geminiErr) {
              console.warn('Gemini also failed:', geminiErr)
              throw bigErr // report the primary (Groq) cause
            }
          }
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

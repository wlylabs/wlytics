import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publishToBlogger } from '@/lib/blogger'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Result = {
  article_id: string
  status: 'published' | 'skipped' | 'failed'
  blogger_url?: string
  error?: string
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function POST(req: Request) {
  try {
    const { article_ids } = (await req.json()) as { article_ids: string[] }

    let published = 0
    let failed = 0
    const results: Result[] = []

    for (const article_id of article_ids) {
      try {
        // 2. Fetch article
        const { data: article, error } = await supabaseAdmin
          .from('articles')
          .select('*')
          .eq('id', article_id)
          .single()

        if (error || !article) {
          failed++
          results.push({ article_id, status: 'failed', error: 'Article not found' })
          continue
        }

        // 3. Skip if already on Blogger
        if (article.blogger_url) {
          results.push({ article_id, status: 'skipped', blogger_url: article.blogger_url })
          continue
        }

        // 4. Publish
        const result = await publishToBlogger({
          title: article.title,
          content: article.content,
          tags: article.tags ?? []
        })

        // 6. Persist
        await supabaseAdmin
          .from('articles')
          .update({
            blogger_url: result.url,
            blogger_post_id: result.id,
            blogger_published_at: new Date().toISOString()
          })
          .eq('id', article_id)

        published++
        results.push({ article_id, status: 'published', blogger_url: result.url ?? undefined })

        // 5. Rate-limit: wait 3s between publishes
        await delay(3000)
      } catch (err) {
        failed++
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.push({ article_id, status: 'failed', error: message })
      }
    }

    return NextResponse.json({ success: true, published, failed, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

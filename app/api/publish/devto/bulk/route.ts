import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publishToDevto } from '@/lib/devto'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Result = {
  article_id: string
  status: 'published' | 'skipped' | 'failed'
  devto_url?: string
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
        const { data: article, error } = await supabaseAdmin
          .from('articles')
          .select('*')
          .eq('id', article_id)
          .single()

        if (error || !article) {
          failed++
          results.push({ article_id, status: 'failed', error: 'Artikel tidak ditemukan' })
          continue
        }

        if (article.devto_url) {
          results.push({ article_id, status: 'skipped', devto_url: article.devto_url })
          continue
        }

        const result = await publishToDevto({
          title: article.title,
          content: article.content,
          tags: article.tags ?? [],
          canonicalUrl: article.blogger_url ?? undefined
        })

        await supabaseAdmin
          .from('articles')
          .update({
            devto_url: result.url,
            devto_post_id: result.id.toString(),
            devto_published_at: new Date().toISOString()
          })
          .eq('id', article_id)

        published++
        results.push({ article_id, status: 'published', devto_url: result.url })

        // Dev.to rate limit ketat — tunggu 10 detik antar artikel
        await delay(10000)
      } catch (err) {
        failed++
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.push({ article_id, status: 'failed', error: message })
      }
    }

    return NextResponse.json({ success: true, published, failed, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal bulk publish ke Dev.to'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

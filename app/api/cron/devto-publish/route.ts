import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publishToDevto } from '@/lib/devto'
import { isAutopilotEnabled } from '@/lib/settings'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Dev.to rate limit is strict — cap how many we push per run and space them out.
const MAX_PER_RUN = 3

export async function GET(req: Request) {
  // 1. Authorize (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>").
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // 1b. Respect the auto-pilot on/off switch.
  if (!(await isAutopilotEnabled())) {
    console.log('[cron:devto] auto-pilot is stopped, skipping run')
    return NextResponse.json({ success: true, skipped: true, reason: 'Auto-pilot dihentikan' })
  }

  try {
    // 2. Articles already published to Blogger but not yet on Dev.to.
    const { data: pending, error: fetchErr } = await supabaseAdmin
      .from('articles')
      .select('*')
      .not('blogger_url', 'is', null)
      .is('devto_url', null)
      .order('blogger_published_at', { ascending: true })
      .limit(MAX_PER_RUN)
    if (fetchErr) throw fetchErr

    const articles = pending ?? []
    console.log(`[cron:devto] found ${articles.length} article(s) pending Dev.to publish`)

    const results: { title: string; devto_url: string | null }[] = []
    let published = 0

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i]
      try {
        console.log(`[cron:devto] (${i + 1}/${articles.length}) publishing "${article.title}"…`)
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
          .eq('id', article.id)

        published++
        results.push({ title: article.title, devto_url: result.url })
        console.log(`[cron:devto]   done: ${result.url}`)
      } catch (err) {
        console.error(`[cron:devto]   FAILED for "${article.title}":`, err)
        results.push({ title: article.title, devto_url: null })
      }

      // Dev.to rate limit — wait between articles, but not after the last.
      if (i < articles.length - 1) await delay(10000)
    }

    const status: 'success' | 'partial' | 'failed' =
      articles.length === 0 || published === articles.length
        ? 'success'
        : published === 0
          ? 'failed'
          : 'partial'

    await logRun({ status, published, articles_data: results, error_message: null })

    const payload = {
      success: true,
      published_devto: published,
      articles: results,
      timestamp: new Date().toISOString()
    }
    console.log('[cron:devto] finished:', JSON.stringify(payload))
    return NextResponse.json(payload)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron:devto] fatal error:', message)
    await logRun({ status: 'failed', published: 0, articles_data: [], error_message: message })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

async function logRun(entry: {
  status: 'success' | 'partial' | 'failed'
  published: number
  articles_data: { title: string; devto_url: string | null }[]
  error_message: string | null
}) {
  try {
    await supabaseAdmin.from('cron_logs').insert({ ...entry, generated: 0 })
  } catch (err) {
    console.error('[cron:devto] failed to write cron_logs:', err)
  }
}

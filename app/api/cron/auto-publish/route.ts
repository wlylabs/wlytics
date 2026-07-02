import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { groqComplete, groqFast } from '@/lib/groq'
import { geminiComplete } from '@/lib/gemini'
import { PROMPTS } from '@/lib/prompts'
import { getArticleType, suggestArticleType } from '@/lib/articleTypes'
import { publishToBlogger } from '@/lib/blogger'
import { publishToDevto } from '@/lib/devto'
import { isAutopilotEnabled } from '@/lib/settings'
import { notifyFailure } from '@/lib/notify'
import type { Keyword } from '@/types'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Ceiling on keywords considered per run. RUN_BUDGET_MS (below) is what
// actually decides how many get processed — this just bounds the DB fetch.
const MAX_PER_RUN = Number(process.env.CRON_MAX_PER_RUN) || 4

// Soft deadline for the whole run, leaving ~15s of headroom under Vercel's
// 60s hard function kill (maxDuration above) for the in-flight keyword to
// finish and for cleanup/logging. Checked between keywords, not mid-keyword,
// so a keyword already in progress always runs to completion.
const RUN_BUDGET_MS = 45_000

// A keyword can be left stuck in 'in_progress' if the function is killed
// mid-run (e.g. RUN_BUDGET_MS undershoot, cold start, provider outage).
// Reclaim anything stale so it's retried instead of lost forever.
const STALE_IN_PROGRESS_MS = 10 * 60 * 1000

export async function GET(req: Request) {
  // 1. Authorize (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>").
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // 1b. Respect the auto-pilot on/off switch (scheduled + manual runs).
  if (!(await isAutopilotEnabled())) {
    console.log('[cron] auto-pilot is stopped, skipping run')
    return NextResponse.json({ success: true, skipped: true, reason: 'Auto-pilot dihentikan' })
  }

  const startedAt = Date.now()

  try {
    // 2. Reclaim keywords orphaned by a previous run that got killed mid-flight.
    await reclaimStaleKeywords()

    // 3. Get the next unused keywords (oldest first).
    let keywords = await fetchUnused()
    console.log(`[cron] found ${keywords.length} unused keyword(s)`)

    // 4. None left -> research a fresh batch, then take some.
    if (keywords.length === 0) {
      console.log('[cron] no unused keywords, researching new batch…')
      await researchKeywords()
      keywords = await fetchUnused()
      console.log(`[cron] researched, now ${keywords.length} unused keyword(s)`)
    }

    const articles: { title: string; blogger_url: string | null; devto_url: string | null }[] = []
    let generated = 0
    let publishedBlogger = 0
    let publishedDevto = 0
    let processed = 0

    // 5. Process each keyword, stopping early if the time budget runs out.
    for (let i = 0; i < keywords.length; i++) {
      if (i > 0) {
        if (Date.now() - startedAt > RUN_BUDGET_MS) {
          console.log(
            `[cron] time budget reached, stopping after ${i}/${keywords.length} keyword(s)`
          )
          break
        }
        // wait 5s before the next keyword (rate limit)
        await delay(5000)
      }

      const kw = keywords[i]
      processed++
      console.log(`[cron] (${i + 1}/${keywords.length}) keyword: "${kw.keyword}"`)
      try {
        // a. mark in progress
        await supabaseAdmin
          .from('keywords')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', kw.id)

        const type = getArticleType(suggestArticleType(kw.keyword, kw.intent))

        // b. outline (fast model to stay within the 60s function limit)
        console.log('[cron]   generating outline…')
        const outline = await groqFast(PROMPTS.generate_outline(kw.keyword, type))

        // c. article — fast Groq model (gpt-oss-20b) for speed; Gemini fallback
        console.log('[cron]   generating article…')
        const articlePrompt = PROMPTS.generate_article(kw.keyword, outline, type)
        let content: string
        try {
          content = await groqFast(articlePrompt, 8192)
        } catch (err) {
          console.warn('[cron]   Groq failed, falling back to Gemini:', err)
          content = await geminiComplete(articlePrompt)
        }

        // d. meta
        console.log('[cron]   generating meta…')
        const rawMeta = await groqFast(PROMPTS.generate_meta(kw.keyword, content.slice(0, 500)))
        const match = rawMeta.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('Failed to parse meta JSON')
        const meta = JSON.parse(match[0]) as {
          meta_title: string
          meta_description: string
          slug: string
          tags: string[]
          kategori: string
        }

        const word_count = content.trim().split(/\s+/).filter(Boolean).length

        // e. save article
        console.log('[cron]   saving article…')
        const { data: article, error: insertErr } = await supabaseAdmin
          .from('articles')
          .insert({
            keyword_id: kw.id,
            keyword: kw.keyword,
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
        if (insertErr || !article) throw insertErr ?? new Error('Insert failed')
        generated++

        // f. publish to Blogger
        console.log('[cron]   publishing to Blogger…')
        const result = await publishToBlogger({
          title: article.title,
          content: article.content,
          tags: article.tags ?? [],
          keyword: kw.keyword
        })

        // g. mark article published (Blogger)
        const bloggerUrl = result.url ?? null
        await supabaseAdmin
          .from('articles')
          .update({
            blogger_url: bloggerUrl,
            blogger_post_id: result.id,
            blogger_published_at: new Date().toISOString(),
            status: 'published'
          })
          .eq('id', article.id)
        publishedBlogger++
        console.log(`[cron]   Blogger done: ${bloggerUrl}`)

        // h. publish to Dev.to (soft-fail — Blogger success is enough)
        let devtoUrl: string | null = null
        try {
          console.log('[cron]   waiting 5s before Dev.to…')
          await delay(5000)
          console.log('[cron]   publishing to Dev.to…')
          const devtoResult = await publishToDevto({
            title: article.title,
            content: article.content,
            tags: article.tags ?? [],
            canonicalUrl: bloggerUrl ?? undefined
          })
          devtoUrl = devtoResult.url
          await supabaseAdmin
            .from('articles')
            .update({
              devto_url: devtoUrl,
              devto_post_id: devtoResult.id.toString(),
              devto_published_at: new Date().toISOString()
            })
            .eq('id', article.id)
          publishedDevto++
          console.log(`[cron]   Dev.to done: ${devtoUrl}`)
        } catch (devtoErr) {
          console.error('[cron]   Dev.to publish failed (non-fatal):', devtoErr)
        }

        // i. mark keyword done
        await supabaseAdmin
          .from('keywords')
          .update({ status: 'done', updated_at: new Date().toISOString() })
          .eq('id', kw.id)

        articles.push({ title: article.title, blogger_url: bloggerUrl, devto_url: devtoUrl })
        console.log(`[cron]   keyword done`)
      } catch (err) {
        // Per-keyword failure: log, revert keyword so it can be retried, continue.
        console.error(`[cron]   FAILED for "${kw.keyword}":`, err)
        await supabaseAdmin
          .from('keywords')
          .update({ status: 'unused', updated_at: new Date().toISOString() })
          .eq('id', kw.id)
      }
    }

    // 6. Result + log
    const status: 'success' | 'partial' | 'failed' =
      processed > 0 && publishedBlogger === processed
        ? 'success'
        : publishedBlogger === 0
          ? 'failed'
          : 'partial'

    await logRun({ status, generated, published: publishedBlogger, articles_data: articles, error_message: null })

    if (status === 'failed') {
      await notifyFailure(
        `[wlytics] Cron auto-publish gagal — ${processed} keyword dicoba, 0 berhasil dipublish ke Blogger.`
      )
    } else if (status === 'partial') {
      await notifyFailure(
        `[wlytics] Cron auto-publish partial — ${publishedBlogger}/${processed} keyword berhasil dipublish ke Blogger.`
      )
    }

    const payload = {
      success: true,
      fetched: keywords.length,
      processed,
      generated,
      published_blogger: publishedBlogger,
      published_devto: publishedDevto,
      articles,
      duration_ms: Date.now() - startedAt,
      timestamp: new Date().toISOString()
    }
    console.log('[cron] finished:', JSON.stringify(payload))
    return NextResponse.json(payload)
  } catch (err) {
    // 7. Outer failure
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron] fatal error:', message)
    await logRun({
      status: 'failed',
      generated: 0,
      published: 0,
      articles_data: [],
      error_message: message
    })
    await notifyFailure(`[wlytics] Cron auto-publish error fatal: ${message}`)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

async function logRun(entry: {
  status: 'success' | 'partial' | 'failed'
  generated: number
  published: number
  articles_data: { title: string; blogger_url: string | null }[]
  error_message: string | null
}) {
  try {
    await supabaseAdmin.from('cron_logs').insert(entry)
  } catch (err) {
    console.error('[cron] failed to write cron_logs:', err)
  }
}

async function reclaimStaleKeywords(): Promise<void> {
  const staleBefore = new Date(Date.now() - STALE_IN_PROGRESS_MS).toISOString()
  const { error } = await supabaseAdmin
    .from('keywords')
    .update({ status: 'unused', updated_at: new Date().toISOString() })
    .eq('status', 'in_progress')
    .lt('updated_at', staleBefore)
  if (error) console.error('[cron] failed to reclaim stale keywords:', error)
}

async function fetchUnused(): Promise<Keyword[]> {
  const { data, error } = await supabaseAdmin
    .from('keywords')
    .select('*')
    .eq('status', 'unused')
    .order('created_at', { ascending: true })
    .limit(MAX_PER_RUN)
  if (error) throw error
  return (data ?? []) as Keyword[]
}

async function researchKeywords(): Promise<void> {
  const raw = await groqComplete(PROMPTS.keyword_research())
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Failed to parse keyword research JSON')
  const parsed = JSON.parse(match[0]) as Array<{
    keyword: string
    intent: string
    estimasi_artikel: string
  }>
  const rows = parsed.map((k) => ({ ...k, status: 'unused' }))
  const { error } = await supabaseAdmin.from('keywords').insert(rows)
  if (error) throw error
}

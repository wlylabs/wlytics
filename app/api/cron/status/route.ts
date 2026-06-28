import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAutopilotEnabled } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const SCHEDULE = '0 1 * * *' // daily 01:00 UTC / 08:00 WIB

// Summarizes the auto-pilot: configuration readiness + run stats.
export async function GET() {
  try {
    const configured = !!process.env.CRON_SECRET
    const bloggerReady =
      !!process.env.GOOGLE_REFRESH_TOKEN && !!process.env.BLOGGER_BLOG_ID

    const { data: lastRows } = await supabaseAdmin
      .from('cron_logs')
      .select('run_at, status, generated, published, error_message')
      .order('run_at', { ascending: false })
      .limit(1)

    const { count: totalRuns } = await supabaseAdmin
      .from('cron_logs')
      .select('*', { count: 'exact', head: true })

    const { data: publishedRows } = await supabaseAdmin
      .from('cron_logs')
      .select('published')

    const totalPublished = (publishedRows ?? []).reduce(
      (sum, r) => sum + (r.published ?? 0),
      0
    )

    const enabled = await isAutopilotEnabled()

    return NextResponse.json({
      success: true,
      data: {
        configured,
        bloggerReady,
        enabled,
        schedule: SCHEDULE,
        scheduleLabel: 'Setiap hari 08:00 WIB',
        lastRun: lastRows?.[0] ?? null,
        totalRuns: totalRuns ?? 0,
        totalPublished
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

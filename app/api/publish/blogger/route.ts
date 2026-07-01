import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publishToBlogger, getBloggerInfo } from '@/lib/blogger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { article_id } = (await req.json()) as { article_id: string }

    // 1. Fetch article
    const { data: article, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('id', article_id)
      .single()

    // 2. Guard
    if (error || !article) throw new Error('Article not found')

    // 3. Publish to Blogger — the operation that actually matters.
    const result = await publishToBlogger({
      title: article.title,
      content: article.content,
      tags: article.tags ?? [],
      keyword: article.keyword,
      featured_image_url: article.featured_image_url ?? undefined,
      featured_image_alt: article.featured_image_alt ?? undefined
    })

    // 4. Persist Blogger fields — best effort. The post is already live, so a
    //    DB write failure (e.g. missing column) must NOT fail the request.
    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({
        blogger_url: result.url,
        blogger_post_id: result.id,
        blogger_published_at: new Date().toISOString()
      })
      .eq('id', article_id)

    if (updateError) {
      console.error('Blogger post published but DB update failed:', updateError)
    }

    // 5. Always return success once the post is live.
    return NextResponse.json({ success: true, blogger_url: result.url, persisted: !updateError })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// Connection-status check: returns the connected blog's info.
export async function GET() {
  try {
    const data = await getBloggerInfo()
    return NextResponse.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publishToWordPress } from '@/lib/wordpress'

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

    // 3. Publish to WordPress — the operation that actually matters.
    const wpResult = await publishToWordPress({
      title: article.title,
      content: article.content,
      slug: article.slug,
      meta_description: article.meta_description
    })

    // 4. Persist WordPress fields — best effort. The post is already live, so a
    //    DB write failure (or timeout) must NOT fail the request and make the
    //    user think publishing failed.
    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({
        status: 'published',
        wp_post_id: wpResult.id,
        wp_url: wpResult.link,
        published_at: new Date().toISOString()
      })
      .eq('id', article_id)

    if (updateError) {
      console.error('WordPress post published but DB update failed:', updateError)
    }

    // 5. Always return success once the post is live.
    return NextResponse.json({ success: true, wp_url: wpResult.link, persisted: !updateError })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

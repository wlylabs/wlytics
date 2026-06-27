import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publishToWordPress } from '@/lib/wordpress'

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

    // 3. Publish to WordPress
    const wpResult = await publishToWordPress({
      title: article.title,
      content: article.content,
      slug: article.slug,
      meta_description: article.meta_description
    })

    // 4. Update article
    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({
        status: 'published',
        wp_post_id: wpResult.id,
        wp_url: wpResult.link,
        published_at: new Date().toISOString()
      })
      .eq('id', article_id)

    if (updateError) throw updateError

    // 5. Return
    return NextResponse.json({ success: true, wp_url: wpResult.link })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

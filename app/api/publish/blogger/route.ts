import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publishToBlogger, getBloggerInfo } from '@/lib/blogger'

export const dynamic = 'force-dynamic'

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

    // 3. Publish to Blogger
    const result = await publishToBlogger({
      title: article.title,
      content: article.content,
      tags: article.tags ?? [],
      keyword: article.keyword
    })

    // 4. Persist Blogger fields
    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({
        blogger_url: result.url,
        blogger_post_id: result.id,
        blogger_published_at: new Date().toISOString()
      })
      .eq('id', article_id)

    if (updateError) throw updateError

    // 5. Return
    return NextResponse.json({ success: true, blogger_url: result.url })
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

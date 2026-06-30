import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { publishToDevto, getDevtoUser } from '@/lib/devto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const user = await getDevtoUser()
    return NextResponse.json({ success: true, data: user })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal terhubung ke Dev.to'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { article_id } = (await req.json()) as { article_id: string }

    const { data: article, error } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('id', article_id)
      .single()

    if (error || !article) throw new Error('Artikel tidak ditemukan')
    if (article.devto_url) throw new Error('Artikel sudah dipublish ke Dev.to')

    const result = await publishToDevto({
      title: article.title,
      content: article.content,
      tags: article.tags ?? [],
      canonicalUrl: article.blogger_url ?? undefined
    })

    const { error: updateError } = await supabaseAdmin
      .from('articles')
      .update({
        devto_url: result.url,
        devto_post_id: result.id.toString(),
        devto_published_at: new Date().toISOString()
      })
      .eq('id', article_id)

    if (updateError) {
      console.error('Dev.to post published but DB update failed:', updateError)
    }

    return NextResponse.json({ success: true, devto_url: result.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal publish ke Dev.to'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

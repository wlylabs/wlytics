import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function count(table: string, filter?: { column: string; value: string }) {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
  if (filter) query = query.eq(filter.column, filter.value)

  const { count: total, error } = await query
  if (error) throw error
  return total ?? 0
}

export async function GET() {
  try {
    const [
      total_articles,
      published,
      draft,
      generated,
      total_keywords,
      unused_keywords
    ] = await Promise.all([
      count('articles'),
      count('articles', { column: 'status', value: 'published' }),
      count('articles', { column: 'status', value: 'draft' }),
      count('articles', { column: 'status', value: 'generated' }),
      count('keywords'),
      count('keywords', { column: 'status', value: 'unused' })
    ])

    return NextResponse.json({
      success: true,
      data: {
        total_articles,
        published,
        draft,
        generated,
        total_keywords,
        unused_keywords
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Returns the 10 most recent auto-pilot (cron) runs.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('cron_logs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

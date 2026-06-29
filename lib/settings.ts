import { supabaseAdmin } from '@/lib/supabase'

// Key/value app settings stored in Supabase. Keeps the auto-pilot
// on/off switch persistent so the scheduled cron can be paused.

const AUTOPILOT_KEY = 'autopilot_enabled'

// Whether the auto-pilot is enabled. Defaults to `true` when the setting
// (or the table) is missing, so a fresh install keeps running as before.
export async function isAutopilotEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', AUTOPILOT_KEY)
      .maybeSingle()
    if (error || !data) return true
    // Tolerate values stored as boolean, string, or number.
    const v = data.value
    return v !== false && v !== 'false' && v !== 0 && v !== '0'
  } catch {
    return true
  }
}

export async function setAutopilotEnabled(enabled: boolean): Promise<void> {
  const { error } = await supabaseAdmin.from('app_settings').upsert(
    { key: AUTOPILOT_KEY, value: enabled, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) {
    // Supabase errors aren't `Error` instances, so re-wrap them to keep the
    // real message (e.g. "relation app_settings does not exist") instead of
    // surfacing a generic "Unknown error" in the UI.
    const hint =
      error.code === '42P01'
        ? ' — tabel app_settings belum ada, jalankan supabase/schema.sql di Supabase'
        : ''
    throw new Error(`${error.message}${hint}`)
  }
}

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
    return data.value !== false
  } catch {
    return true
  }
}

export async function setAutopilotEnabled(enabled: boolean): Promise<void> {
  const { error } = await supabaseAdmin.from('app_settings').upsert(
    { key: AUTOPILOT_KEY, value: enabled, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) throw error
}

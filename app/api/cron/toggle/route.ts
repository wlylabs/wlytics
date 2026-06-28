import { NextResponse } from 'next/server'
import { isAutopilotEnabled, setAutopilotEnabled } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// Returns the current auto-pilot enabled state.
export async function GET() {
  try {
    const enabled = await isAutopilotEnabled()
    return NextResponse.json({ success: true, data: { enabled } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// Turns the auto-pilot on/off. Body: { enabled: boolean }
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { enabled?: unknown }
    const enabled = body.enabled === true
    await setAutopilotEnabled(enabled)
    return NextResponse.json({ success: true, data: { enabled } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

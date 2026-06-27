import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/blogger'

export const dynamic = 'force-dynamic'

// Kick off the Google OAuth flow by redirecting to the consent screen.
export async function GET() {
  return NextResponse.redirect(getAuthUrl())
}

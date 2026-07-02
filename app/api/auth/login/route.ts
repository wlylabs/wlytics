import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Single-admin login: checks the submitted password against ADMIN_PASSWORD
// and, on success, sets a signed session cookie (see lib/auth.ts).
export async function POST(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return NextResponse.json(
      { success: false, error: 'ADMIN_PASSWORD belum dikonfigurasi di server' },
      { status: 500 }
    )
  }

  const body = (await req.json().catch(() => ({}))) as { password?: unknown }
  const password = typeof body.password === 'string' ? body.password : ''

  if (password !== adminPassword) {
    return NextResponse.json({ success: false, error: 'Password salah' }, { status: 401 })
  }

  const token = await createSessionToken()
  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000
  })
  return res
}

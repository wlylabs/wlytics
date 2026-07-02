import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth'

// Routes that must stay reachable without a session:
// - /login, /api/auth/login: the login flow itself.
// - /api/cron/*: authorized separately via CRON_SECRET bearer token.
// - /api/health: no sensitive data, used for uptime checks.
const PUBLIC_PATHS = new Set(['/login', '/api/auth/login'])
const PUBLIC_PREFIXES = ['/api/cron/', '/api/health']

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const authed = await verifySessionToken(token)
  if (authed) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/).*)']
}

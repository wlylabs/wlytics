// Signed session cookie for gating the dashboard behind a single admin
// password. Uses Web Crypto (available in both the Node and Edge runtimes)
// instead of `Buffer`/`node:crypto` so the same code works in middleware.

export const SESSION_COOKIE = 'wlytics_session'
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not configured')
  return secret
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return toBase64Url(sig)
}

export async function createSessionToken(): Promise<string> {
  const exp = Date.now() + SESSION_TTL_MS
  const sig = await sign(String(exp), getAuthSecret())
  return `${exp}.${sig}`
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const [expStr, sig] = token.split('.')
  if (!expStr || !sig) return false
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return false
  try {
    const expected = await sign(expStr, getAuthSecret())
    return expected === sig
  } catch {
    return false
  }
}

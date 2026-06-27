import { getTokenFromCode } from '@/lib/blogger'

export const dynamic = 'force-dynamic'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function page(body: string, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Blogger OAuth · wlytics</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f9fafb; color: #111827; margin: 0; padding: 2rem; }
    .card { max-width: 640px; margin: 4rem auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 2px rgba(0,0,0,.05); }
    h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
    p { color: #6b7280; font-size: .9rem; }
    code { display: block; word-break: break-all; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-top: 1rem; font-family: ui-monospace, monospace; font-size: .85rem; }
    .err { color: #dc2626; }
  </style>
</head>
<body>
  <div class="card">
    ${body}
  </div>
</body>
</html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

// OAuth redirect target: exchanges the ?code for tokens and shows the
// refresh_token to copy into the Vercel/.env GOOGLE_REFRESH_TOKEN variable.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return page('<h1 class="err">Gagal</h1><p>Parameter <code>code</code> tidak ditemukan di URL.</p>', 400)
  }

  try {
    const tokens = await getTokenFromCode(code)

    if (!tokens.refresh_token) {
      return page(
        `<h1 class="err">Tidak ada refresh_token</h1>
         <p>Google tidak mengembalikan refresh_token (biasanya karena consent sudah pernah diberikan).
         Hapus akses app di <a href="https://myaccount.google.com/permissions">Google Account Permissions</a>,
         lalu coba lagi lewat <code>/api/auth/blogger</code>.</p>`,
        200
      )
    }

    return page(
      `<h1>✅ Berhasil! Copy GOOGLE_REFRESH_TOKEN ini ke Vercel:</h1>
       <p>Tambahkan sebagai environment variable <strong>GOOGLE_REFRESH_TOKEN</strong>, lalu redeploy.</p>
       <code>${escapeHtml(tokens.refresh_token)}</code>`
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return page(`<h1 class="err">Gagal menukar code</h1><p>${escapeHtml(message)}</p>`, 500)
  }
}

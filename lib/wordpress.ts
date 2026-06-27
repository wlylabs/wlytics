function getConfig() {
  const url = process.env.WP_URL
  const username = process.env.WP_USERNAME
  const password = process.env.WP_APP_PASSWORD

  if (!url || !username || !password) {
    throw new Error(
      'Konfigurasi WordPress belum lengkap. Set WP_URL, WP_USERNAME, dan WP_APP_PASSWORD di .env.local'
    )
  }

  const credentials = Buffer.from(`${username}:${password}`).toString('base64')
  return { url: url.replace(/\/+$/, ''), credentials }
}

export async function publishToWordPress(article: {
  title: string
  content: string
  slug: string
  meta_description: string
}) {
  const { url, credentials } = getConfig()
  const endpoint = `${url}/wp-json/wp/v2/posts`

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: article.title,
        content: article.content,
        slug: article.slug,
        status: 'publish',
        meta: { yoast_wpseo_metadesc: article.meta_description }
      })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Tidak bisa terhubung ke WordPress (${endpoint}): ${message}`)
  }

  // Read as text first so a non-JSON response (HTML login/error page) gives a
  // clear message instead of a cryptic "Unexpected token '<'".
  const raw = await res.text()
  let data: { id?: number; link?: string; message?: string } | null = null
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    const snippet = raw.slice(0, 120).replace(/\s+/g, ' ').trim()
    throw new Error(
      `WordPress mengembalikan respons non-JSON (HTTP ${res.status}). ` +
        `Cek WP_URL dan pastikan REST API aktif. Cuplikan: ${snippet}`
    )
  }

  if (!res.ok) {
    throw new Error(`WordPress Error ${res.status}: ${data?.message ?? res.statusText}`)
  }

  return data as { id: number; link: string }
}

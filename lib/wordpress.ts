const WP_URL = process.env.WP_URL
const credentials = Buffer.from(
  `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
).toString('base64')

export async function publishToWordPress(article: {
  title: string
  content: string
  slug: string
  meta_description: string
}) {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
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
  if (!res.ok) throw new Error(`WordPress Error: ${res.statusText}`)
  return res.json()
}

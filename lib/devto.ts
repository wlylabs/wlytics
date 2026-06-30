const BASE = 'https://dev.to/api'

function getApiKey(): string {
  const key = process.env.DEVTO_API_KEY
  if (!key) throw new Error('DEVTO_API_KEY belum diset di environment variables')
  return key
}

function cleanContent(content: string): string {
  return content
    .replace(/\[AFFILIATE_\d+\]/g, '')
    .replace(/\[CTA_BOX\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function sanitizeTag(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20)
}

async function devtoFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'api-key': getApiKey(),
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!res.ok) {
    const raw = await res.text()
    let message = `Dev.to API error (HTTP ${res.status})`
    try {
      const json = JSON.parse(raw) as { error?: string }
      if (json.error) message = `Dev.to: ${json.error}`
    } catch {
      if (raw.trim()) message += `: ${raw.slice(0, 120).trim()}`
    }
    throw new Error(message)
  }

  return res
}

export async function publishToDevto(article: {
  title: string
  content: string
  tags: string[]
  canonicalUrl?: string
}): Promise<{ id: number; url: string; title: string }> {
  const body = {
    article: {
      title: article.title,
      body_markdown: cleanContent(article.content),
      published: true,
      tags: article.tags.slice(0, 4).map(sanitizeTag).filter(Boolean),
      ...(article.canonicalUrl ? { canonical_url: article.canonicalUrl } : {})
    }
  }

  const res = await devtoFetch('/articles', {
    method: 'POST',
    body: JSON.stringify(body)
  })

  const data = (await res.json()) as { id: number; url: string; title: string }
  return { id: data.id, url: data.url, title: data.title }
}

export async function getDevtoUser(): Promise<{
  username: string
  name: string
  profile_image: string
}> {
  const res = await devtoFetch('/users/me')
  const data = (await res.json()) as {
    username: string
    name: string
    profile_image: string
  }
  return {
    username: data.username,
    name: data.name,
    profile_image: data.profile_image
  }
}

export async function getDevtoArticles(): Promise<
  Array<{ id: number; title: string; url: string; published_at: string; page_views_count: number }>
> {
  const res = await devtoFetch('/articles/me')
  const data = (await res.json()) as Array<{
    id: number
    title: string
    url: string
    published_at: string
    page_views_count: number
  }>
  return data.map((a) => ({
    id: a.id,
    title: a.title,
    url: a.url,
    published_at: a.published_at,
    page_views_count: a.page_views_count
  }))
}

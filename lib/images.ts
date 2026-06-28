// Fetch a relevant, openly-licensed featured image via Openverse (keyless).
// Returns null on any failure so publishing never breaks because of images.
export type FeaturedImage = {
  url: string
  title: string
  creator?: string
  source?: string
  license?: string
}

export async function getFeaturedImage(query: string): Promise<FeaturedImage | null> {
  try {
    const params = new URLSearchParams({
      q: query,
      page_size: '1',
      license_type: 'commercial',
      mature: 'false'
    })
    const res = await fetch(`https://api.openverse.org/v1/images/?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return null

    const data = (await res.json()) as {
      results?: Array<{
        url?: string
        title?: string
        creator?: string
        source?: string
        license?: string
        license_version?: string
      }>
    }

    const item = data.results?.[0]
    if (!item?.url) return null

    return {
      url: item.url,
      title: item.title ?? query,
      creator: item.creator,
      source: item.source,
      license: item.license
        ? `${item.license.toUpperCase()}${item.license_version ? ` ${item.license_version}` : ''}`
        : undefined
    }
  } catch {
    return null
  }
}

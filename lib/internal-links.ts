import { supabaseAdmin } from '@/lib/supabase'

export type RelatedArticle = {
  id: string
  title: string
  slug: string
  blogger_url: string | null
  url: string
}

type CandidateRow = {
  id: string
  title: string
  keyword: string | null
  slug: string
  kategori: string | null
  tags: string[] | null
  blogger_url: string | null
  devto_url: string | null
}

// Generic filler words that shouldn't count as a "shared keyword" match.
const STOPWORDS = new Set([
  'cara', 'tips', 'trik', 'panduan', 'tutorial', 'langkah', 'terbaik',
  'adalah', 'yang', 'untuk', 'dengan', 'dari', 'dan', 'atau', 'ini', 'itu',
  'di', 'ke', 'apa', 'bagaimana', 'kenapa', 'mengapa', 'agar', 'supaya', 'biar'
])

function extractWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  )
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  return Array.from(a).some((w) => b.has(w))
}

// Simple, keyless internal-linking suggestion: fetch other published articles
// and rank by category match, shared tags, and shared title/keyword words.
export async function findRelatedArticles(
  currentKeyword: string,
  currentArticleId: string
): Promise<RelatedArticle[]> {
  try {
    const { data: current } = await supabaseAdmin
      .from('articles')
      .select('kategori, tags')
      .eq('id', currentArticleId)
      .maybeSingle()

    const currentKategori: string | null = current?.kategori ?? null
    const currentTags = new Set<string>(
      ((current?.tags as string[] | null) ?? []).map((t) => t.toLowerCase())
    )
    const currentWords = extractWords(currentKeyword)

    const { data, error } = await supabaseAdmin
      .from('articles')
      .select('id, title, keyword, slug, kategori, tags, blogger_url, devto_url')
      .eq('status', 'published')
      .neq('id', currentArticleId)

    if (error || !data) return []
    const candidates = data as CandidateRow[]

    const scored = candidates.map((a) => {
      let score = 0

      if (currentKategori && a.kategori === currentKategori) score += 3

      const tags = a.tags ?? []
      const sharedTags = tags.filter((t) => currentTags.has(t.toLowerCase()))
      score += sharedTags.length * 2

      const titleWords = extractWords(`${a.title} ${a.keyword ?? ''}`)
      if (hasOverlap(currentWords, titleWords)) score += 1

      return { article: a, score }
    })

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ article }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        blogger_url: article.blogger_url,
        url: article.blogger_url ?? article.devto_url ?? ''
      }))
  } catch (err) {
    console.error('findRelatedArticles failed:', err)
    return []
  }
}

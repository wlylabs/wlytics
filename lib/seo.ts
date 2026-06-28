// Lightweight on-page SEO scorer — pure analysis, no external calls.

export type SeoCheck = { label: string; pass: boolean; detail: string }
export type SeoReport = { score: number; checks: SeoCheck[] }

const TITLE_LIMIT = 60
const DESC_MIN = 120
const DESC_LIMIT = 155

// Words that carry no SEO weight and shouldn't be required in a title.
const STOPWORDS = new Set([
  'untuk', 'dan', 'atau', 'di', 'ke', 'dari', 'yang', 'dengan', 'pada', 'vs',
  'the', 'a', 'an', 'of', 'for', 'to', 'in', 'on'
])

// Significant words of a keyword: drop stopwords and trivial 1-2 char tokens,
// but keep short model/spec tokens that contain a digit (e.g. "i5", "i7").
function coreTokens(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t) && (t.length >= 3 || /\d/.test(t)))
}

// Long-tail keywords rarely fit verbatim in a ≤60-char title, so a literal
// substring match is the wrong test. Pass if the target contains the keyword
// exactly OR covers a strong majority of its core words.
function keywordCovered(keyword: string, target: string): { pass: boolean; ratio: number } {
  const t = target.toLowerCase()
  if (!keyword) return { pass: false, ratio: 0 }
  if (t.includes(keyword.toLowerCase())) return { pass: true, ratio: 1 }
  const tokens = coreTokens(keyword)
  if (tokens.length === 0) return { pass: false, ratio: 0 }
  const present = tokens.filter((tok) => t.includes(tok)).length
  const ratio = present / tokens.length
  return { pass: ratio >= 0.6, ratio }
}

export function scoreArticle(article: {
  content: string
  keyword: string
  meta_title?: string
  meta_description?: string
  word_count?: number
}): SeoReport {
  const content = article.content ?? ''
  const keyword = (article.keyword ?? '').toLowerCase().trim()
  const text = content.toLowerCase()
  const words = content.trim().split(/\s+/).filter(Boolean)
  const wordCount = article.word_count || words.length

  const keywordCount = keyword ? text.split(keyword).length - 1 : 0
  const density = wordCount > 0 ? (keywordCount * (keyword.split(/\s+/).length || 1)) / wordCount : 0
  const first100 = words.slice(0, 100).join(' ').toLowerCase()
  const h2Count = (content.match(/^##\s+/gm) || []).length
  const linkCount = (content.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g) || []).length
  const metaTitle = article.meta_title ?? ''
  const metaDesc = article.meta_description ?? ''

  const titleKeyword = keywordCovered(keyword, metaTitle)
  const first100Keyword = keywordCovered(keyword, first100)

  const checks: SeoCheck[] = [
    {
      label: 'Keyword di meta title',
      pass: titleKeyword.pass,
      detail: 'Meta title sebaiknya mengandung kata inti keyword utama.'
    },
    {
      label: 'Meta title ≤ 60 karakter',
      pass: metaTitle.length > 0 && metaTitle.length <= TITLE_LIMIT,
      detail: `Saat ini ${metaTitle.length} karakter.`
    },
    {
      label: 'Meta description 120–155 karakter',
      pass: metaDesc.length >= DESC_MIN && metaDesc.length <= DESC_LIMIT,
      detail: `Saat ini ${metaDesc.length} karakter.`
    },
    {
      label: 'Keyword di 100 kata pertama',
      pass: first100Keyword.pass,
      detail: 'Munculkan keyword di paragraf pembuka.'
    },
    {
      label: 'Densitas keyword 0.5–2.5%',
      pass: density >= 0.005 && density <= 0.025,
      detail: `Saat ini ${(density * 100).toFixed(1)}% (${keywordCount}x).`
    },
    {
      label: 'Panjang konten cukup (≥ 600 kata)',
      pass: wordCount >= 600,
      detail: `Saat ini ${wordCount} kata.`
    },
    {
      label: 'Minimal 3 subjudul (H2)',
      pass: h2Count >= 3,
      detail: `Saat ini ${h2Count} H2.`
    },
    {
      label: 'Minimal 1 tautan',
      pass: linkCount >= 1,
      detail: `Saat ini ${linkCount} tautan.`
    }
  ]

  const passed = checks.filter((c) => c.pass).length
  const score = Math.round((passed / checks.length) * 100)
  return { score, checks }
}

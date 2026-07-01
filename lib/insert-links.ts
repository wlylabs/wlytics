import type { RelatedArticle } from '@/lib/internal-links'

// Deterministic internal-link insertion: append a "Baca Juga" section with
// markdown links instead of rewriting text mid-paragraph, which risks
// breaking existing markdown (headings, code blocks, existing links).
export function insertInternalLinks(content: string, relatedArticles: RelatedArticle[]): string {
  const links = relatedArticles.filter((a) => a.url)
  if (links.length === 0) return content

  const section = ['', '', '## Baca Juga', '', ...links.map((a) => `- [${a.title}](${a.url})`)].join(
    '\n'
  )

  return content.trimEnd() + section
}

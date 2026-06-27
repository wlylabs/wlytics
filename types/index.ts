export type ArticleStatus = 'draft' | 'generated' | 'reviewed' | 'published'
export type KeywordStatus = 'unused' | 'in_progress' | 'done'
export type KeywordIntent = 'informational' | 'commercial'

export interface Keyword {
  id: string
  keyword: string
  intent: KeywordIntent
  estimasi_artikel: string
  status: KeywordStatus
  created_at: string
}

export interface Article {
  id: string
  keyword_id: string
  keyword: string
  title: string
  content: string
  meta_title: string
  meta_description: string
  slug: string
  tags: string[]
  kategori: string
  status: ArticleStatus
  wp_post_id?: number
  wp_url?: string
  word_count: number
  created_at: string
  published_at?: string
}

export interface DashboardStats {
  total_articles: number
  published: number
  draft: number
  generated: number
  total_keywords: number
  unused_keywords: number
}

export interface ApiResponse<T> {
  success?: boolean
  data?: T
  error?: string
}

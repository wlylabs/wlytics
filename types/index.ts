export type ArticleStatus = 'draft' | 'generated' | 'reviewed' | 'published'
export type KeywordStatus = 'unused' | 'in_progress' | 'done'
export type KeywordIntent = 'informational' | 'commercial'
export type CronStatus = 'success' | 'partial' | 'failed'

export interface CronLog {
  id: string
  run_at: string
  status: CronStatus
  generated: number
  published: number
  error_message?: string | null
  articles_data?: { title: string; blogger_url: string | null }[] | null
}

export interface CronStatusData {
  configured: boolean
  bloggerReady: boolean
  enabled: boolean
  schedule: string
  scheduleLabel: string
  lastRun: Pick<CronLog, 'run_at' | 'status' | 'generated' | 'published' | 'error_message'> | null
  totalRuns: number
  totalPublished: number
}

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
  blogger_post_id?: string
  blogger_url?: string
  blogger_published_at?: string
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

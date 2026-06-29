'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FileText, Globe, Rss, Eye } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import type { Article } from '@/types'

type Filter = 'all' | 'draft' | 'generated' | 'published'

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Siap publish', value: 'generated' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function ArticlesPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/articles')
        const json = await res.json()
        if (json.success) setArticles(json.data ?? [])
        else toast.error(json.error ?? 'Gagal memuat artikel')
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat artikel')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(
    () => (filter === 'all' ? articles : articles.filter((a) => a.status === filter)),
    [articles, filter]
  )

  const counts = useMemo(
    () => ({
      all: articles.length,
      draft: articles.filter((a) => a.status === 'draft').length,
      generated: articles.filter((a) => a.status === 'generated').length,
      published: articles.filter((a) => a.status === 'published').length
    }),
    [articles]
  )

  return (
    <>
      <Header
        title="Semua Artikel"
        subtitle={loading ? 'Memuat...' : `${articles.length} artikel total`}
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                  active
                    ? 'bg-[#111111] text-white'
                    : 'bg-white text-[#6B7280] ring-1 ring-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label}
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-100 text-[#6B7280]'
                  }`}
                >
                  {counts[f.value]}
                </span>
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title="Belum ada artikel"
              description="Generate artikel dari keyword yang tersedia untuk mulai mengisi daftar ini."
              action={
                <Button variant="primary" onClick={() => router.push('/generate')}>
                  Generate Artikel
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {filtered.map((article) => (
              <Card key={article.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Badge status={article.status} />
                  <div className="flex items-center gap-1.5">
                    {article.wp_url && (
                      <span
                        title="Terbit di WordPress"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </span>
                    )}
                    {article.blogger_url && (
                      <span
                        title="Terbit di Blogger"
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-50 text-orange-600"
                      >
                        <Rss className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-3 line-clamp-2 text-sm font-semibold text-[#111111]">{article.title}</h3>
                <span className="mt-2 inline-flex w-fit items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-[#6B7280]">
                  {article.keyword}
                </span>

                <p className="mt-3 text-xs text-[#6B7280]">
                  {article.word_count} kata · {formatDate(article.created_at)}
                </p>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    onClick={() => router.push(`/articles/${article.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                    Preview & Publish
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

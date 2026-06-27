'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FileText } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import EmptyState from '@/components/ui/EmptyState'
import type { Article, ArticleStatus } from '@/types'

type Filter = 'all' | 'draft' | 'generated' | 'published'

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Generated', value: 'generated' },
  { label: 'Published', value: 'published' }
]

const PUBLISHABLE: ArticleStatus[] = ['generated', 'reviewed']

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
  const [publishingId, setPublishingId] = useState<string | null>(null)

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

  async function handlePublish(article: Article) {
    setPublishingId(article.id)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Artikel berhasil dipublish!')
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id
              ? { ...a, status: 'published', wp_url: json.wp_url }
              : a
          )
        )
      } else {
        toast.error(json.error ?? 'Gagal publish artikel')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal publish artikel')
    } finally {
      setPublishingId(null)
    }
  }

  return (
    <>
      <Header
        title="Semua Artikel"
        subtitle={loading ? 'Memuat...' : `${articles.length} artikel total`}
      />

      <div className="space-y-6 p-8">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loader text="Memuat artikel..." />
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filtered.map((article) => {
              const canPublish = PUBLISHABLE.includes(article.status)
              return (
                <Card key={article.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 font-semibold text-gray-900">{article.title}</h3>
                    <Badge status={article.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{article.keyword}</p>

                  <p className="mt-3 text-sm text-gray-500">
                    {article.word_count} kata · {formatDate(article.created_at)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/articles/${article.id}`)}
                    >
                      Preview
                    </Button>
                    {canPublish && (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={publishingId === article.id}
                        disabled={publishingId === article.id}
                        onClick={() => handlePublish(article)}
                      >
                        Publish
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

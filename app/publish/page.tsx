'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Upload, ExternalLink } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { parseJson } from '@/lib/http'
import type { Article, ArticleStatus } from '@/types'

const PUBLISHABLE: ArticleStatus[] = ['generated', 'reviewed']

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function PublishPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
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

  const ready = useMemo(
    () => articles.filter((a) => PUBLISHABLE.includes(a.status)),
    [articles]
  )
  const published = useMemo(
    () => articles.filter((a) => a.status === 'published'),
    [articles]
  )

  async function handlePublish(article: Article) {
    setPublishingId(article.id)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id })
      })
      const json = await parseJson<{ success: boolean; wp_url?: string; error?: string }>(res)
      if (json.success) {
        toast.success('Artikel berhasil dipublish!')
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id ? { ...a, status: 'published', wp_url: json.wp_url } : a
          )
        )
      } else {
        toast.error(json.error ?? 'Gagal publish artikel')
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Gagal publish artikel')
    } finally {
      setPublishingId(null)
    }
  }

  return (
    <>
      <Header
        title="Publish ke WordPress"
        subtitle="Kirim artikel yang sudah digenerate ke situs WordPress kamu"
      />

      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <>
            {/* Ready to publish */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Siap Dipublish ({ready.length})
              </h2>
              {ready.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={Upload}
                    title="Tidak ada artikel siap publish"
                    description="Artikel dengan status generated atau reviewed akan muncul di sini."
                    action={
                      <Button variant="primary" onClick={() => router.push('/generate')}>
                        Generate Artikel
                      </Button>
                    }
                  />
                </Card>
              ) : (
                <div className="space-y-3">
                  {ready.map((article) => (
                    <Card key={article.id}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/articles/${article.id}`)}
                              className="truncate text-left font-medium text-gray-900 hover:text-indigo-600"
                            >
                              {article.title}
                            </button>
                            <Badge status={article.status} />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {article.keyword} · {article.word_count} kata · {formatDate(article.created_at)}
                          </p>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          loading={publishingId === article.id}
                          disabled={publishingId === article.id}
                          onClick={() => handlePublish(article)}
                          className="shrink-0"
                        >
                          <Upload className="h-4 w-4" />
                          Publish
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Already published */}
            {published.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                  Sudah Dipublish ({published.length})
                </h2>
                <div className="space-y-3">
                  {published.map((article) => (
                    <Card key={article.id}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{article.title}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {article.keyword} · {formatDate(article.published_at ?? article.created_at)}
                          </p>
                        </div>
                        {article.wp_url && (
                          <a
                            href={article.wp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Lihat di WordPress
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { FileText, Rss, Eye } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import { ARTICLE_TYPES } from '@/lib/articleTypes'
import type { Article } from '@/types'

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

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/articles', { cache: 'no-store' })
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

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: Article[] }>()
    for (const type of ARTICLE_TYPES) {
      map.set(type.id, { label: type.label, items: [] })
    }
    for (const article of articles) {
      const key = article.kategori ?? ''
      if (map.has(key)) {
        map.get(key)!.items.push(article)
      } else {
        if (!map.has('lainnya')) map.set('lainnya', { label: 'Lainnya', items: [] })
        map.get('lainnya')!.items.push(article)
      }
    }
    return Array.from(map.values()).filter((g) => g.items.length > 0)
  }, [articles])

  return (
    <>
      <Header
        title="Semua Artikel"
        subtitle={loading ? 'Memuat...' : `${articles.length} artikel total`}
      />

      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : articles.length === 0 ? (
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
          grouped.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 text-sm font-semibold text-[#111111]">{group.label}</h2>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                {group.items.map((article) => (
                  <Card key={article.id} className="flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Badge status={article.status} />
                      <div className="flex items-center gap-1.5">
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
            </section>
          ))
        )}
      </div>
    </>
  )
}

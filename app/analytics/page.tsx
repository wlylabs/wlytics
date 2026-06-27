'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { Article, Keyword } from '@/types'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function IntentBadge({ intent }: { intent: string }) {
  const color =
    intent === 'commercial'
      ? 'bg-green-100 text-green-700'
      : 'bg-blue-100 text-blue-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}>
      {intent}
    </span>
  )
}

export default function AnalyticsPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [articlesRes, keywordsRes] = await Promise.all([
          fetch('/api/articles'),
          fetch('/api/keywords')
        ])
        const articlesJson = await articlesRes.json()
        const keywordsJson = await keywordsRes.json()
        if (articlesJson.success) setArticles(articlesJson.data ?? [])
        if (keywordsJson.success) setKeywords(keywordsJson.data ?? [])
      } catch (err) {
        console.error('Failed to load analytics', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => {
    const published = articles.filter((a) => a.status === 'published').length
    const generated = articles.filter((a) => a.status === 'generated').length
    const draft = articles.filter((a) => a.status === 'draft').length
    const keywordsUsed = keywords.filter((k) => k.status === 'done').length
    const keywordsLeft = keywords.filter((k) => k.status === 'unused').length
    return { published, generated, draft, keywordsUsed, keywordsLeft, total: articles.length }
  }, [articles, keywords])

  const sortedArticles = useMemo(
    () =>
      [...articles].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [articles]
  )

  const usedKeywords = useMemo(
    () => keywords.filter((k) => k.status === 'done'),
    [keywords]
  )

  if (loading) {
    return (
      <>
        <Header title="Analytics" subtitle="Statistik produksi konten dari Supabase" />
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </>
    )
  }

  const overviewCards = [
    { label: 'Artikel Published', value: stats.published },
    { label: 'Artikel Generated', value: stats.generated },
    { label: 'Keywords Used', value: stats.keywordsUsed },
    { label: 'Keywords Tersisa', value: stats.keywordsLeft }
  ]

  const breakdown = [
    { label: 'Draft', value: stats.draft, bar: 'bg-gray-400' },
    { label: 'Generated', value: stats.generated, bar: 'bg-blue-500' },
    { label: 'Published', value: stats.published, bar: 'bg-green-500' }
  ]

  return (
    <>
      <Header title="Analytics" subtitle="Statistik produksi konten dari Supabase" />

      <div className="space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
        {/* Stats overview */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {overviewCards.map((c) => (
            <Card key={c.label}>
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{c.value}</p>
            </Card>
          ))}
        </div>

        {/* Status breakdown */}
        <Card title="Status Breakdown">
          <div className="space-y-4">
            {breakdown.map((item) => {
              const pct = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500">
                      {item.value} artikel · {pct}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Article pipeline table */}
        <Card title="Artikel Pipeline">
          {sortedArticles.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Belum ada artikel.</p>
          ) : (
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 pr-4 font-medium">Judul</th>
                    <th className="pb-3 pr-4 font-medium">Keyword</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Word Count</th>
                    <th className="pb-3 pr-4 font-medium">Tanggal</th>
                    <th className="pb-3 font-medium">WordPress URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedArticles.map((article) => (
                    <tr key={article.id}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{article.title}</td>
                      <td className="py-3 pr-4 text-gray-500">{article.keyword}</td>
                      <td className="py-3 pr-4">
                        <Badge status={article.status} />
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{article.word_count}</td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(article.created_at)}</td>
                      <td className="py-3">
                        {article.wp_url ? (
                          <a
                            href={article.wp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            Lihat
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile cards */}
          {sortedArticles.length > 0 && (
            <ul className="space-y-3 sm:hidden">
              {sortedArticles.map((article) => (
                <li key={article.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-gray-900">{article.title}</p>
                    <Badge status={article.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {article.keyword} · {article.word_count} kata · {formatDate(article.created_at)}
                  </p>
                  {article.wp_url && (
                    <a
                      href={article.wp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      Lihat di WordPress
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Keyword usage table */}
        <Card title="Keyword Usage (Sudah Dipakai)">
          {usedKeywords.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Belum ada keyword yang dipakai.
            </p>
          ) : (
            <>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 pr-4 font-medium">Keyword</th>
                    <th className="pb-3 pr-4 font-medium">Intent</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Estimasi Artikel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usedKeywords.map((kw) => (
                    <tr key={kw.id}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{kw.keyword}</td>
                      <td className="py-3 pr-4">
                        <IntentBadge intent={kw.intent} />
                      </td>
                      <td className="py-3 pr-4">
                        <Badge status={kw.status} />
                      </td>
                      <td className="py-3 text-gray-500">{kw.estimasi_artikel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-3 sm:hidden">
              {usedKeywords.map((kw) => (
                <li key={kw.id} className="rounded-lg border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-gray-900">{kw.keyword}</p>
                    <Badge status={kw.status} />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{kw.estimasi_artikel}</p>
                  <div className="mt-2">
                    <IntentBadge intent={kw.intent} />
                  </div>
                </li>
              ))}
            </ul>
            </>
          )}
        </Card>
      </div>
    </>
  )
}

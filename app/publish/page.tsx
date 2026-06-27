'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Upload,
  ExternalLink,
  Rss,
  Globe,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogIn
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { parseJson } from '@/lib/http'
import type { Article, ArticleStatus } from '@/types'

const PUBLISHABLE: ArticleStatus[] = ['generated', 'reviewed']

type BloggerInfo = { name?: string; url?: string; posts?: number }
type BloggerStatus = 'loading' | 'connected' | 'disconnected'
type BulkResult = {
  article_id: string
  status: 'published' | 'skipped' | 'failed'
  blogger_url?: string
  error?: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function PublishPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  // Per-platform single-publish in-flight ids
  const [wpPublishingId, setWpPublishingId] = useState<string | null>(null)
  const [bloggerPublishingId, setBloggerPublishingId] = useState<string | null>(null)

  // Blogger connection
  const [bloggerStatus, setBloggerStatus] = useState<BloggerStatus>('loading')
  const [bloggerInfo, setBloggerInfo] = useState<BloggerInfo | null>(null)
  const [testing, setTesting] = useState(false)

  // Bulk publish
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkPublishing, setBulkPublishing] = useState(false)
  const [bulkCount, setBulkCount] = useState(0)

  async function loadArticles() {
    try {
      const res = await fetch('/api/articles')
      const json = await parseJson<{ success: boolean; data?: Article[]; error?: string }>(res)
      if (json.success) setArticles(json.data ?? [])
      else toast.error(json.error ?? 'Gagal memuat artikel')
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Gagal memuat artikel')
    } finally {
      setLoading(false)
    }
  }

  async function checkBlogger(silent = true) {
    setBloggerStatus('loading')
    try {
      const res = await fetch('/api/publish/blogger')
      const json = await parseJson<{ success: boolean; data?: BloggerInfo; error?: string }>(res)
      if (json.success && json.data) {
        setBloggerInfo(json.data)
        setBloggerStatus('connected')
        if (!silent) toast.success('Koneksi Blogger OK')
      } else {
        setBloggerStatus('disconnected')
        if (!silent) toast.error(json.error ?? 'Blogger belum terhubung')
      }
    } catch (err) {
      setBloggerStatus('disconnected')
      if (!silent) toast.error(err instanceof Error ? err.message : 'Blogger belum terhubung')
    }
  }

  useEffect(() => {
    loadArticles()
    checkBlogger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isConnected = bloggerStatus === 'connected'

  // Articles eligible for Blogger bulk publish: not yet on Blogger.
  const bloggerEligible = useMemo(
    () => articles.filter((a) => !a.blogger_url),
    [articles]
  )
  const wpPublishedCount = useMemo(
    () => articles.filter((a) => a.wp_url).length,
    [articles]
  )

  function patchArticle(id: string, patch: Partial<Article>) {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  async function handleWpPublish(article: Article) {
    setWpPublishingId(article.id)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id })
      })
      const json = await parseJson<{ success: boolean; wp_url?: string; error?: string }>(res)
      if (json.success) {
        toast.success('Artikel dipublish ke WordPress!')
        patchArticle(article.id, { status: 'published', wp_url: json.wp_url })
      } else {
        toast.error(json.error ?? 'Gagal publish ke WordPress')
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Gagal publish ke WordPress')
    } finally {
      setWpPublishingId(null)
    }
  }

  async function handleBloggerPublish(article: Article) {
    setBloggerPublishingId(article.id)
    try {
      const res = await fetch('/api/publish/blogger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id })
      })
      const json = await parseJson<{ success: boolean; blogger_url?: string; error?: string }>(res)
      if (json.success) {
        toast.success('Artikel dipublish ke Blogger!')
        patchArticle(article.id, { blogger_url: json.blogger_url })
        setSelected((prev) => {
          const next = new Set(prev)
          next.delete(article.id)
          return next
        })
      } else {
        toast.error(json.error ?? 'Gagal publish ke Blogger')
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Gagal publish ke Blogger')
    } finally {
      setBloggerPublishingId(null)
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const allSelected = bloggerEligible.length > 0 && selected.size === bloggerEligible.length
    setSelected(allSelected ? new Set() : new Set(bloggerEligible.map((a) => a.id)))
  }

  async function handleBulkPublish() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setBulkPublishing(true)
    setBulkCount(ids.length)
    try {
      const res = await fetch('/api/publish/blogger/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_ids: ids })
      })
      const json = await parseJson<{
        success: boolean
        published?: number
        failed?: number
        results?: BulkResult[]
        error?: string
      }>(res)

      if (json.success) {
        // Apply published results to local state.
        json.results?.forEach((r) => {
          if (r.status === 'published' && r.blogger_url) {
            patchArticle(r.article_id, { blogger_url: r.blogger_url })
          }
        })
        setSelected(new Set())
        toast.success(`Selesai: ${json.published ?? 0} dipublish, ${json.failed ?? 0} gagal`)
      } else {
        toast.error(json.error ?? 'Bulk publish gagal')
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Bulk publish gagal')
    } finally {
      setBulkPublishing(false)
      setBulkCount(0)
    }
  }

  const allSelected = bloggerEligible.length > 0 && selected.size === bloggerEligible.length

  return (
    <>
      <Header
        title="Publish"
        subtitle="Kirim artikel ke WordPress atau Blogger"
      />

      <div className="space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Platform cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          {/* WordPress */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Globe className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900">WordPress</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Publish via REST API · {wpPublishedCount} terpublish
                </p>
              </div>
            </div>
          </Card>

          {/* Blogger */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Rss className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">Blogger</h3>
                  {bloggerStatus === 'loading' ? (
                    <span className="text-xs text-gray-400">memeriksa…</span>
                  ) : isConnected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                      <XCircle className="h-3.5 w-3.5" /> Disconnected
                    </span>
                  )}
                </div>

                {isConnected ? (
                  <>
                    <p className="mt-0.5 truncate text-sm text-gray-500">
                      {bloggerInfo?.name ?? 'Blog'} · {bloggerInfo?.posts ?? 0} posts
                    </p>
                    <div className="mt-3">
                      <Button variant="secondary" size="sm" loading={testing} onClick={async () => {
                        setTesting(true)
                        await checkBlogger(false)
                        setTesting(false)
                      }}>
                        <RefreshCw className="h-4 w-4" />
                        Test Koneksi
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        window.location.href = '/api/auth/blogger'
                      }}
                    >
                      <LogIn className="h-4 w-4" />
                      Connect Blogger
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Connect guide */}
        {bloggerStatus === 'disconnected' && (
          <Card title="Cara Connect Blogger">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-600">
              <li>Klik <strong>Connect Blogger</strong>.</li>
              <li>Login dengan akun Google.</li>
              <li>Copy <code className="rounded bg-gray-100 px-1">GOOGLE_REFRESH_TOKEN</code>.</li>
              <li>Tambahkan ke Vercel Environment Variables.</li>
              <li>Redeploy.</li>
            </ol>
          </Card>
        )}

        {/* Bulk publish */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Bulk Publish ke Blogger</h3>
              <p className="mt-0.5 text-sm text-gray-500">
                {bulkPublishing
                  ? `Publishing ${bulkCount} artikel ke Blogger…`
                  : `${selected.size} dipilih · ${bloggerEligible.length} artikel belum di Blogger`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleSelectAll}
                disabled={bloggerEligible.length === 0 || bulkPublishing}
              >
                {allSelected ? 'Batal Pilih' : 'Pilih Semua'}
              </Button>
              <Button
                variant="primary"
                onClick={handleBulkPublish}
                loading={bulkPublishing}
                disabled={!isConnected || selected.size === 0 || bulkPublishing}
              >
                <Upload className="h-4 w-4" />
                Bulk Publish
              </Button>
            </div>
          </div>
          {!isConnected && (
            <p className="mt-3 text-xs text-orange-600">
              Hubungkan Blogger dulu untuk bisa publish.
            </p>
          )}
        </Card>

        {/* Articles table */}
        <Card title="Artikel">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Belum ada artikel.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-3 font-medium">
                        <input
                          type="checkbox"
                          aria-label="Pilih semua"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          disabled={bloggerEligible.length === 0 || bulkPublishing}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="pb-3 pr-4 font-medium">Judul</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">WordPress</th>
                      <th className="pb-3 font-medium">Blogger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {articles.map((article) => (
                      <tr key={article.id}>
                        <td className="py-3 pr-3">
                          <input
                            type="checkbox"
                            aria-label={`Pilih ${article.title}`}
                            checked={selected.has(article.id)}
                            onChange={() => toggleSelect(article.id)}
                            disabled={!!article.blogger_url || bulkPublishing}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                          />
                        </td>
                        <td className="max-w-xs py-3 pr-4 font-medium text-gray-900">
                          <span className="line-clamp-1">{article.title}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge status={article.status} />
                        </td>
                        <td className="py-3 pr-4">
                          {article.wp_url ? (
                            <a
                              href={article.wp_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700"
                            >
                              Lihat <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : PUBLISHABLE.includes(article.status) ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={wpPublishingId === article.id}
                              disabled={wpPublishingId === article.id}
                              onClick={() => handleWpPublish(article)}
                            >
                              Publish
                            </Button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          {article.blogger_url ? (
                            <a
                              href={article.blogger_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-orange-600 hover:text-orange-700"
                            >
                              Lihat <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={bloggerPublishingId === article.id}
                              disabled={!isConnected || bloggerPublishingId === article.id || bulkPublishing}
                              onClick={() => handleBloggerPublish(article)}
                            >
                              → Blogger
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="space-y-3 sm:hidden">
                {articles.map((article) => (
                  <li key={article.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${article.title}`}
                        checked={selected.has(article.id)}
                        onChange={() => toggleSelect(article.id)}
                        disabled={!!article.blogger_url || bulkPublishing}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-40"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-gray-900">{article.title}</p>
                          <Badge status={article.status} />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{formatDate(article.created_at)}</p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {/* WordPress */}
                          {article.wp_url ? (
                            <a
                              href={article.wp_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600"
                            >
                              <Globe className="h-3.5 w-3.5" /> WordPress
                            </a>
                          ) : PUBLISHABLE.includes(article.status) ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={wpPublishingId === article.id}
                              disabled={wpPublishingId === article.id}
                              onClick={() => handleWpPublish(article)}
                            >
                              <Globe className="h-4 w-4" /> WordPress
                            </Button>
                          ) : null}

                          {/* Blogger */}
                          {article.blogger_url ? (
                            <a
                              href={article.blogger_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-orange-600"
                            >
                              <Rss className="h-3.5 w-3.5" /> Blogger
                            </a>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={bloggerPublishingId === article.id}
                              disabled={!isConnected || bloggerPublishingId === article.id || bulkPublishing}
                              onClick={() => handleBloggerPublish(article)}
                            >
                              <Rss className="h-4 w-4" /> Blogger
                            </Button>
                          )}
                        </div>
                      </div>
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

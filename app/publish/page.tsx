'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
type DevtoInfo = { username?: string; name?: string }
type DevtoStatus = 'loading' | 'connected' | 'disconnected'

// Module-level caches — persist across in-app navigations to avoid status flash
let bloggerCache: { status: BloggerStatus; info: BloggerInfo | null } | null = null
let devtoCache: { status: DevtoStatus; info: DevtoInfo | null } | null = null

type BulkResult = {
  article_id: string
  status: 'published' | 'skipped' | 'failed'
  blogger_url?: string
  devto_url?: string
  error?: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function ConnectionBadge({ status }: { status: 'loading' | 'connected' | 'disconnected' }) {
  if (status === 'loading') return <span className="text-xs text-[#6B7280]">memeriksa…</span>
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> Connected
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280]">
      <XCircle className="h-3.5 w-3.5" /> Disconnected
    </span>
  )
}

export default function PublishPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  // Per-platform single-publish in-flight ids
  const [wpPublishingId, setWpPublishingId] = useState<string | null>(null)
  const [bloggerPublishingId, setBloggerPublishingId] = useState<string | null>(null)
  const [devtoPublishingId, setDevtoPublishingId] = useState<string | null>(null)

  // Blogger connection
  const [bloggerStatus, setBloggerStatus] = useState<BloggerStatus>(bloggerCache?.status ?? 'loading')
  const [bloggerInfo, setBloggerInfo] = useState<BloggerInfo | null>(bloggerCache?.info ?? null)
  const [bloggerTesting, setBloggerTesting] = useState(false)

  // Dev.to connection
  const [devtoStatus, setDevtoStatus] = useState<DevtoStatus>(devtoCache?.status ?? 'loading')
  const [devtoInfo, setDevtoInfo] = useState<DevtoInfo | null>(devtoCache?.info ?? null)
  const [devtoTesting, setDevtoTesting] = useState(false)

  // Blogger bulk
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkPublishing, setBulkPublishing] = useState(false)
  const [bulkCount, setBulkCount] = useState(0)

  // Dev.to bulk
  const [devtoSelected, setDevtoSelected] = useState<Set<string>>(new Set())
  const [devtoBulkPublishing, setDevtoBulkPublishing] = useState(false)
  const [devtoBulkProgress, setDevtoBulkProgress] = useState(0)
  const [devtoBulkTotal, setDevtoBulkTotal] = useState(0)
  const devtoBulkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadArticles() {
    try {
      const res = await fetch('/api/articles', { cache: 'no-store' })
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
    if (!silent || !bloggerCache) setBloggerStatus('loading')
    try {
      const res = await fetch('/api/publish/blogger')
      const json = await parseJson<{ success: boolean; data?: BloggerInfo; error?: string }>(res)
      if (json.success && json.data) {
        bloggerCache = { status: 'connected', info: json.data }
        setBloggerInfo(json.data)
        setBloggerStatus('connected')
        if (!silent) toast.success('Koneksi Blogger OK')
      } else {
        bloggerCache = { status: 'disconnected', info: null }
        setBloggerStatus('disconnected')
        if (!silent) toast.error(json.error ?? 'Blogger belum terhubung')
      }
    } catch (err) {
      bloggerCache = { status: 'disconnected', info: null }
      setBloggerStatus('disconnected')
      if (!silent) toast.error(err instanceof Error ? err.message : 'Blogger belum terhubung')
    }
  }

  async function checkDevto(silent = true) {
    if (!silent || !devtoCache) setDevtoStatus('loading')
    try {
      const res = await fetch('/api/publish/devto')
      const json = await parseJson<{ success: boolean; data?: DevtoInfo; error?: string }>(res)
      if (json.success && json.data) {
        devtoCache = { status: 'connected', info: json.data }
        setDevtoInfo(json.data)
        setDevtoStatus('connected')
        if (!silent) toast.success('Koneksi Dev.to OK')
      } else {
        devtoCache = { status: 'disconnected', info: null }
        setDevtoStatus('disconnected')
        if (!silent) toast.error(json.error ?? 'Dev.to belum terhubung')
      }
    } catch (err) {
      devtoCache = { status: 'disconnected', info: null }
      setDevtoStatus('disconnected')
      if (!silent) toast.error(err instanceof Error ? err.message : 'Dev.to belum terhubung')
    }
  }

  useEffect(() => {
    loadArticles()
    checkBlogger()
    checkDevto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clean up progress timer on unmount
  useEffect(() => {
    return () => {
      if (devtoBulkTimerRef.current) clearTimeout(devtoBulkTimerRef.current)
    }
  }, [])

  const isBloggerConnected = bloggerStatus === 'connected'
  const isDevtoConnected = devtoStatus === 'connected'

  const bloggerEligible = useMemo(() => articles.filter((a) => !a.blogger_url), [articles])
  const devtoEligible = useMemo(() => articles.filter((a) => !a.devto_url), [articles])
  const wpPublishedCount = useMemo(() => articles.filter((a) => a.wp_url).length, [articles])
  const devtoPublishedCount = useMemo(() => articles.filter((a) => a.devto_url).length, [articles])

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
        setSelected((prev) => { const n = new Set(prev); n.delete(article.id); return n })
      } else {
        toast.error(json.error ?? 'Gagal publish ke Blogger')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal publish ke Blogger')
    } finally {
      setBloggerPublishingId(null)
    }
  }

  async function handleDevtoPublish(article: Article) {
    setDevtoPublishingId(article.id)
    try {
      const res = await fetch('/api/publish/devto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id })
      })
      const json = await parseJson<{ success: boolean; devto_url?: string; error?: string }>(res)
      if (json.success) {
        toast.success('Artikel dipublish ke Dev.to!')
        patchArticle(article.id, { devto_url: json.devto_url })
        setDevtoSelected((prev) => { const n = new Set(prev); n.delete(article.id); return n })
      } else {
        toast.error(json.error ?? 'Gagal publish ke Dev.to')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal publish ke Dev.to')
    } finally {
      setDevtoPublishingId(null)
    }
  }

  // Blogger bulk
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function toggleSelectAll() {
    const allSelected = bloggerEligible.length > 0 && selected.size === bloggerEligible.length
    setSelected(allSelected ? new Set() : new Set(bloggerEligible.map((a) => a.id)))
  }
  const allSelected = bloggerEligible.length > 0 && selected.size === bloggerEligible.length

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
      const json = await parseJson<{ success: boolean; published?: number; failed?: number; results?: BulkResult[]; error?: string }>(res)
      if (json.success) {
        json.results?.forEach((r) => {
          if (r.status === 'published' && r.blogger_url) patchArticle(r.article_id, { blogger_url: r.blogger_url })
        })
        setSelected(new Set())
        toast.success(`Selesai: ${json.published ?? 0} dipublish, ${json.failed ?? 0} gagal`)
      } else {
        toast.error(json.error ?? 'Bulk publish gagal')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk publish gagal')
    } finally {
      setBulkPublishing(false)
      setBulkCount(0)
    }
  }

  // Dev.to bulk
  function toggleDevtoSelect(id: string) {
    setDevtoSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  function toggleDevtoSelectAll() {
    const allSelected = devtoEligible.length > 0 && devtoSelected.size === devtoEligible.length
    setDevtoSelected(allSelected ? new Set() : new Set(devtoEligible.map((a) => a.id)))
  }
  const allDevtoSelected = devtoEligible.length > 0 && devtoSelected.size === devtoEligible.length

  async function handleDevtoBulkPublish() {
    const ids = Array.from(devtoSelected)
    if (ids.length === 0) return
    setDevtoBulkPublishing(true)
    setDevtoBulkTotal(ids.length)
    setDevtoBulkProgress(0)

    // Animate progress bar to 90% over estimated duration (~12s per article via CSS transition)
    devtoBulkTimerRef.current = setTimeout(() => setDevtoBulkProgress(90), 100)

    try {
      const res = await fetch('/api/publish/devto/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_ids: ids })
      })
      const json = await parseJson<{ success: boolean; published?: number; failed?: number; results?: BulkResult[]; error?: string }>(res)
      if (json.success) {
        json.results?.forEach((r) => {
          if (r.status === 'published' && r.devto_url) patchArticle(r.article_id, { devto_url: r.devto_url })
        })
        setDevtoSelected(new Set())
        setDevtoBulkProgress(100)
        toast.success(`Selesai: ${json.published ?? 0} dipublish ke Dev.to, ${json.failed ?? 0} gagal`)
      } else {
        toast.error(json.error ?? 'Bulk publish Dev.to gagal')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk publish Dev.to gagal')
    } finally {
      setDevtoBulkPublishing(false)
      setDevtoBulkTotal(0)
      setTimeout(() => setDevtoBulkProgress(0), 600)
    }
  }

  return (
    <>
      <Header
        title="Publish"
        subtitle="Kirim artikel ke WordPress, Blogger, atau Dev.to"
      />

      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Platform cards — 3 columns */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* WordPress */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Globe className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-[#111111]">WordPress</h3>
                <p className="mt-0.5 text-sm text-[#6B7280]">{wpPublishedCount} terpublish</p>
              </div>
            </div>
          </Card>

          {/* Blogger */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <Rss className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#111111]">Blogger</h3>
                  <ConnectionBadge status={bloggerStatus} />
                </div>
                {isBloggerConnected ? (
                  <>
                    <p className="mt-0.5 truncate text-sm text-[#6B7280]">
                      {bloggerInfo?.name ?? 'Blog'} · {bloggerInfo?.posts ?? 0} posts
                    </p>
                    <div className="mt-3">
                      <Button variant="secondary" size="sm" loading={bloggerTesting} onClick={async () => {
                        setBloggerTesting(true)
                        await checkBlogger(false)
                        setBloggerTesting(false)
                      }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Test Koneksi
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-3">
                    <Button variant="primary" size="sm" onClick={() => { window.location.href = '/api/auth/blogger' }}>
                      <LogIn className="h-3.5 w-3.5" />
                      Connect
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Dev.to */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111111] text-white text-lg font-bold">
                D
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#111111]">Dev.to</h3>
                  <ConnectionBadge status={devtoStatus} />
                </div>
                {isDevtoConnected ? (
                  <>
                    <p className="mt-0.5 truncate text-sm text-[#6B7280]">
                      @{devtoInfo?.username ?? devtoInfo?.name} · {devtoPublishedCount} terpublish
                    </p>
                    <div className="mt-3">
                      <Button variant="secondary" size="sm" loading={devtoTesting} onClick={async () => {
                        setDevtoTesting(true)
                        await checkDevto(false)
                        setDevtoTesting(false)
                      }}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        Test Koneksi
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Set <code className="rounded bg-gray-100 px-1">DEVTO_API_KEY</code> di env
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Blogger connect guide */}
        {bloggerStatus === 'disconnected' && (
          <Card title="Cara Connect Blogger">
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[#6B7280]">
              <li>Klik <strong className="text-[#111111]">Connect</strong> di card Blogger.</li>
              <li>Login dengan akun Google.</li>
              <li>Copy <code className="rounded bg-gray-100 px-1">GOOGLE_REFRESH_TOKEN</code>.</li>
              <li>Tambahkan ke Vercel Environment Variables.</li>
              <li>Redeploy.</li>
            </ol>
          </Card>
        )}

        {/* Blogger bulk */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-[#111111]">Bulk Publish ke Blogger</h3>
              <p className="mt-0.5 text-sm text-[#6B7280]">
                {bulkPublishing
                  ? `Publishing ${bulkCount} artikel ke Blogger…`
                  : `${selected.size} dipilih · ${bloggerEligible.length} artikel belum di Blogger`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={toggleSelectAll}
                disabled={bloggerEligible.length === 0 || bulkPublishing}>
                {allSelected ? 'Batal Pilih' : 'Pilih Semua'}
              </Button>
              <Button variant="primary" onClick={handleBulkPublish} loading={bulkPublishing}
                disabled={!isBloggerConnected || selected.size === 0 || bulkPublishing}>
                <Upload className="h-4 w-4" />
                Bulk Publish
              </Button>
            </div>
          </div>
          {!isBloggerConnected && (
            <p className="mt-3 text-xs text-orange-600">Hubungkan Blogger dulu untuk bisa publish.</p>
          )}
        </Card>

        {/* Dev.to bulk */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-[#111111]">Bulk Publish ke Dev.to</h3>
              <p className="mt-0.5 text-sm text-[#6B7280]">
                {devtoBulkPublishing
                  ? `Publishing ${devtoBulkTotal} artikel ke Dev.to… (~${Math.ceil(devtoBulkTotal * 12 / 60)}m estimasi)`
                  : `${devtoSelected.size} dipilih · ${devtoEligible.length} artikel belum di Dev.to`}
              </p>
              {/* Progress bar */}
              {devtoBulkPublishing && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#111111]"
                    style={{
                      width: `${devtoBulkProgress}%`,
                      transition: devtoBulkProgress === 100
                        ? 'width 0.3s ease'
                        : `width ${devtoBulkTotal * 12}s linear`
                    }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={toggleDevtoSelectAll}
                disabled={devtoEligible.length === 0 || devtoBulkPublishing}>
                {allDevtoSelected ? 'Batal Pilih' : 'Pilih Semua'}
              </Button>
              <Button variant="primary" onClick={handleDevtoBulkPublish} loading={devtoBulkPublishing}
                disabled={!isDevtoConnected || devtoSelected.size === 0 || devtoBulkPublishing}>
                <Upload className="h-4 w-4" />
                Bulk Publish
              </Button>
            </div>
          </div>
          {!isDevtoConnected && (
            <p className="mt-3 text-xs text-[#6B7280]">
              Set <code className="rounded bg-gray-100 px-1">DEVTO_API_KEY</code> di Vercel env untuk mengaktifkan Dev.to.
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
            <p className="py-8 text-center text-sm text-[#6B7280]">Belum ada artikel.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-[#6B7280]">
                      <th className="pb-3 pr-3 font-medium">
                        <input
                          type="checkbox"
                          aria-label="Pilih semua (Blogger)"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          disabled={bloggerEligible.length === 0 || bulkPublishing}
                          className="h-4 w-4 rounded border-gray-300 accent-[#111111] disabled:opacity-40"
                        />
                      </th>
                      <th className="pb-3 pr-3 font-medium">
                        <input
                          type="checkbox"
                          aria-label="Pilih semua (Dev.to)"
                          checked={allDevtoSelected}
                          onChange={toggleDevtoSelectAll}
                          disabled={devtoEligible.length === 0 || devtoBulkPublishing}
                          className="h-4 w-4 rounded border-gray-300 accent-[#111111] disabled:opacity-40"
                        />
                      </th>
                      <th className="pb-3 pr-4 font-medium">Judul</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">WordPress</th>
                      <th className="pb-3 pr-4 font-medium">Blogger</th>
                      <th className="pb-3 font-medium">Dev.to</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {articles.map((article) => (
                      <tr key={article.id}>
                        <td className="py-3 pr-3">
                          <input
                            type="checkbox"
                            aria-label={`Blogger: ${article.title}`}
                            checked={selected.has(article.id)}
                            onChange={() => toggleSelect(article.id)}
                            disabled={!!article.blogger_url || bulkPublishing}
                            className="h-4 w-4 rounded border-gray-300 accent-[#111111] disabled:opacity-40"
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="checkbox"
                            aria-label={`Dev.to: ${article.title}`}
                            checked={devtoSelected.has(article.id)}
                            onChange={() => toggleDevtoSelect(article.id)}
                            disabled={!!article.devto_url || devtoBulkPublishing}
                            className="h-4 w-4 rounded border-gray-300 accent-[#111111] disabled:opacity-40"
                          />
                        </td>
                        <td className="max-w-[220px] py-3 pr-4">
                          <span className="line-clamp-1 font-medium text-[#111111]">{article.title}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge status={article.status} />
                        </td>
                        {/* WordPress */}
                        <td className="py-3 pr-4">
                          {article.wp_url ? (
                            <a href={article.wp_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700">
                              Lihat <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : PUBLISHABLE.includes(article.status) ? (
                            <Button variant="secondary" size="sm"
                              loading={wpPublishingId === article.id}
                              disabled={wpPublishingId === article.id}
                              onClick={() => handleWpPublish(article)}>
                              Publish
                            </Button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        {/* Blogger */}
                        <td className="py-3 pr-4">
                          {article.blogger_url ? (
                            <a href={article.blogger_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-orange-600 hover:text-orange-700">
                              Lihat <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <Button variant="secondary" size="sm"
                              loading={bloggerPublishingId === article.id}
                              disabled={!isBloggerConnected || bloggerPublishingId === article.id || bulkPublishing}
                              onClick={() => handleBloggerPublish(article)}>
                              → Blogger
                            </Button>
                          )}
                        </td>
                        {/* Dev.to */}
                        <td className="py-3">
                          {article.devto_url ? (
                            <a href={article.devto_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-[#111111] hover:opacity-70">
                              Lihat <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <Button variant="secondary" size="sm"
                              loading={devtoPublishingId === article.id}
                              disabled={!isDevtoConnected || devtoPublishingId === article.id || devtoBulkPublishing}
                              onClick={() => handleDevtoPublish(article)}>
                              → Dev.to
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
                  <li key={article.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[#111111]">{article.title}</p>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge status={article.status} />
                        {article.devto_url && (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#111111] text-[10px] font-bold text-white">
                            D
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-[#6B7280]">{formatDate(article.created_at)}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {/* WordPress */}
                      {article.wp_url ? (
                        <a href={article.wp_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                          <Globe className="h-3.5 w-3.5" /> WP
                        </a>
                      ) : PUBLISHABLE.includes(article.status) ? (
                        <Button variant="secondary" size="sm"
                          loading={wpPublishingId === article.id}
                          disabled={wpPublishingId === article.id}
                          onClick={() => handleWpPublish(article)}>
                          <Globe className="h-4 w-4" /> WP
                        </Button>
                      ) : null}

                      {/* Blogger */}
                      {article.blogger_url ? (
                        <a href={article.blogger_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-orange-600">
                          <Rss className="h-3.5 w-3.5" /> Blogger
                        </a>
                      ) : (
                        <Button variant="secondary" size="sm"
                          loading={bloggerPublishingId === article.id}
                          disabled={!isBloggerConnected || bloggerPublishingId === article.id || bulkPublishing}
                          onClick={() => handleBloggerPublish(article)}>
                          <Rss className="h-4 w-4" /> Blogger
                        </Button>
                      )}

                      {/* Dev.to */}
                      {article.devto_url ? (
                        <a href={article.devto_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#111111]">
                          <span className="text-xs font-bold">D</span> Dev.to
                        </a>
                      ) : (
                        <Button variant="secondary" size="sm"
                          loading={devtoPublishingId === article.id}
                          disabled={!isDevtoConnected || devtoPublishingId === article.id || devtoBulkPublishing}
                          onClick={() => handleDevtoPublish(article)}>
                          <span className="text-xs font-bold">D</span> Dev.to
                        </Button>
                      )}
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

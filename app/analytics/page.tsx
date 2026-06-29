'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Globe, Rss, Upload, Play, Power, CheckCircle2, AlertTriangle, Clock, PauseCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { Article, Keyword, CronLog, CronStatus, CronStatusData } from '@/types'

const CRON_BADGE: Record<CronStatus, string> = {
  success: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700'
}

const CRON_LABEL: Record<CronStatus, string> = {
  success: 'Berhasil',
  partial: 'Sebagian',
  failed: 'Gagal'
}

function CronStatusBadge({ status }: { status: CronStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        CRON_BADGE[status] ?? 'bg-gray-100 text-gray-600'
      }`}
    >
      {CRON_LABEL[status] ?? status}
    </span>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
  const [cronLogs, setCronLogs] = useState<CronLog[]>([])
  const [cronStatus, setCronStatus] = useState<CronStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [toggling, setToggling] = useState(false)

  async function loadData() {
    try {
      const [articlesRes, keywordsRes, logsRes, statusRes] = await Promise.all([
        fetch('/api/articles'),
        fetch('/api/keywords'),
        fetch('/api/cron/logs'),
        fetch('/api/cron/status')
      ])
      const articlesJson = await articlesRes.json()
      const keywordsJson = await keywordsRes.json()
      const logsJson = await logsRes.json()
      const statusJson = await statusRes.json()
      if (articlesJson.success) setArticles(articlesJson.data ?? [])
      if (keywordsJson.success) setKeywords(keywordsJson.data ?? [])
      if (logsJson.success) setCronLogs(logsJson.data ?? [])
      if (statusJson.success) setCronStatus(statusJson.data ?? null)
    } catch (err) {
      console.error('Failed to load analytics', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleRunNow() {
    setRunning(true)
    try {
      const res = await fetch('/api/cron/auto-publish', {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}`
        }
      })

      // A gateway/timeout returns an HTML page, not JSON — handle that cleanly.
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        toast.error(
          'Proses memakan waktu terlalu lama (limit 60 detik di Vercel). Artikel mungkin tetap terbit — cek Riwayat sebentar lagi.'
        )
        await loadData()
        return
      }

      const raw = await res.text()
      let json: { success?: boolean; error?: string }
      try {
        json = JSON.parse(raw)
      } catch {
        toast.error(`Respons tidak valid (HTTP ${res.status}). Coba lagi atau cek Riwayat.`)
        await loadData()
        return
      }

      if (res.ok && json.success) {
        toast.success('✅ Auto-pilot berhasil! Artikel baru sudah dipublish ke Blogger')
        await loadData()
      } else {
        toast.error(json.error ?? 'Auto-pilot gagal')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auto-pilot gagal')
    } finally {
      setRunning(false)
    }
  }

  async function handleToggle(enabled: boolean) {
    setToggling(true)
    try {
      const res = await fetch('/api/cron/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success(enabled ? 'Auto-pilot diaktifkan' : 'Auto-pilot dihentikan')
        await loadData()
      } else {
        toast.error(json.error ?? 'Gagal mengubah status auto-pilot')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status auto-pilot')
    } finally {
      setToggling(false)
    }
  }

  const stats = useMemo(() => {
    const published = articles.filter((a) => a.status === 'published').length
    const generated = articles.filter((a) => a.status === 'generated').length
    const draft = articles.filter((a) => a.status === 'draft').length
    const keywordsUsed = keywords.filter((k) => k.status === 'done').length
    const keywordsLeft = keywords.filter((k) => k.status === 'unused').length
    const wpPublished = articles.filter((a) => a.wp_url).length
    const bloggerPublished = articles.filter((a) => a.blogger_url).length
    const notPublished = articles.filter((a) => !a.wp_url && !a.blogger_url).length
    return {
      published,
      generated,
      draft,
      keywordsUsed,
      keywordsLeft,
      wpPublished,
      bloggerPublished,
      notPublished,
      total: articles.length
    }
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

  const recentBloggerPosts = useMemo(
    () =>
      articles
        .filter((a) => a.blogger_url)
        .sort(
          (a, b) =>
            new Date(b.blogger_published_at ?? b.created_at).getTime() -
            new Date(a.blogger_published_at ?? a.created_at).getTime()
        )
        .slice(0, 5),
    [articles]
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
    { label: 'Artikel Terbit', value: stats.published, dot: 'bg-green-500' },
    { label: 'Siap Publish', value: stats.generated, dot: 'bg-blue-500' },
    { label: 'Keyword Dipakai', value: stats.keywordsUsed, dot: 'bg-violet-500' },
    { label: 'Keyword Tersisa', value: stats.keywordsLeft, dot: 'bg-gray-400' }
  ]

  const breakdown = [
    { label: 'Draf', value: stats.draft, bar: 'bg-gray-400' },
    { label: 'Siap publish', value: stats.generated, bar: 'bg-blue-500' },
    { label: 'Terbit', value: stats.published, bar: 'bg-green-500' }
  ]

  return (
    <>
      <Header title="Analytics" subtitle="Statistik produksi konten dari Supabase" />

      <div className="space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
        {/* Stats overview */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {overviewCards.map((c) => (
            <Card key={c.label}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                <p className="text-sm text-gray-500">{c.label}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{c.value}</p>
            </Card>
          ))}
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">WordPress</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.wpPublished}
                  <span className="ml-1 text-sm font-normal text-gray-400">published</span>
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Rss className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Blogger</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.bloggerPublished}
                  <span className="ml-1 text-sm font-normal text-gray-400">published</span>
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Belum publish</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.notPublished}
                  <span className="ml-1 text-sm font-normal text-gray-400">artikel</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Auto-pilot status */}
        {cronStatus &&
          (() => {
            const enabled = cronStatus.enabled
            const ready = cronStatus.configured && cronStatus.bloggerReady
            const missing: string[] = []
            if (!cronStatus.configured) missing.push('CRON_SECRET belum diset di server')
            if (!cronStatus.bloggerReady) missing.push('Blogger belum terhubung')
            const iconClass = !enabled
              ? 'bg-gray-100 text-gray-500'
              : ready
                ? 'bg-green-50 text-green-600'
                : 'bg-amber-50 text-amber-600'
            const badgeClass = !enabled
              ? 'bg-gray-200 text-gray-600'
              : ready
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            const badgeLabel = !enabled ? 'Dihentikan' : ready ? 'Aktif' : 'Belum siap'
            return (
              <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}
                    >
                      {!enabled ? (
                        <PauseCircle className="h-6 w-6" />
                      ) : ready ? (
                        <CheckCircle2 className="h-6 w-6" />
                      ) : (
                        <AlertTriangle className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">Auto-pilot</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
                        >
                          {badgeLabel}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {cronStatus.scheduleLabel}
                      </p>
                      {!ready && (
                        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-700">
                          {missing.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={running}
                        disabled={running || toggling || !enabled}
                        onClick={handleRunNow}
                        className="w-full whitespace-nowrap sm:w-auto"
                      >
                        <Play className="h-4 w-4" />
                        Jalankan Sekarang
                      </Button>
                      {enabled ? (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={toggling}
                          disabled={toggling || running}
                          onClick={() => handleToggle(false)}
                          className="w-full whitespace-nowrap sm:w-auto"
                        >
                          <Power className="h-4 w-4" />
                          Stop Auto-pilot
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={toggling}
                          disabled={toggling}
                          onClick={() => handleToggle(true)}
                          className="w-full whitespace-nowrap sm:w-auto"
                        >
                          <Power className="h-4 w-4" />
                          Aktifkan Auto-pilot
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {enabled
                        ? '~30–60 detik per artikel'
                        : 'Auto-pilot dihentikan — jadwal harian tidak berjalan'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4 text-center">
                  <div>
                    <p className="text-xs text-gray-400">Terakhir jalan</p>
                    <p className="mt-0.5 text-sm font-medium text-gray-800">
                      {cronStatus.lastRun ? formatDateTime(cronStatus.lastRun.run_at) : 'Belum pernah'}
                    </p>
                    {cronStatus.lastRun && (
                      <div className="mt-1 flex justify-center">
                        <CronStatusBadge status={cronStatus.lastRun.status} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total run</p>
                    <p className="mt-0.5 text-lg font-semibold text-gray-900">
                      {cronStatus.totalRuns}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total terbit</p>
                    <p className="mt-0.5 text-lg font-semibold text-gray-900">
                      {cronStatus.totalPublished}
                    </p>
                  </div>
                </div>
              </Card>
            )
          })()}

        {/* Auto-pilot history */}
        <Card title="Riwayat Auto-pilot">
          {cronLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Belum ada riwayat auto-pilot.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-4 font-medium">Tanggal</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 pr-4 font-medium">Generated</th>
                      <th className="pb-3 pr-4 font-medium">Published</th>
                      <th className="pb-3 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cronLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 pr-4 text-gray-500">{formatDateTime(log.run_at)}</td>
                        <td className="py-3 pr-4">
                          <CronStatusBadge status={log.status} />
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{log.generated}</td>
                        <td className="py-3 pr-4 text-gray-700">{log.published}</td>
                        <td className="max-w-xs py-3 text-gray-500">
                          <span className="line-clamp-1">{log.error_message || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="space-y-3 sm:hidden">
                {cronLogs.map((log) => (
                  <li key={log.id} className="rounded-lg border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-500">{formatDateTime(log.run_at)}</span>
                      <CronStatusBadge status={log.status} />
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      Generated {log.generated} · Published {log.published}
                    </p>
                    {log.error_message && (
                      <p className="mt-1 text-xs text-red-600">{log.error_message}</p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

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
                    <th className="pb-3 pr-4 font-medium">WordPress</th>
                    <th className="pb-3 font-medium">Blogger</th>
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
                      <td className="py-3 pr-4">
                        {article.wp_url ? (
                          <a
                            href={article.wp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
                          >
                            Lihat
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
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
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {article.wp_url && (
                      <a
                        href={article.wp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Globe className="h-3.5 w-3.5" /> WordPress
                      </a>
                    )}
                    {article.blogger_url && (
                      <a
                        href={article.blogger_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
                      >
                        <Rss className="h-3.5 w-3.5" /> Blogger
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent Blogger posts */}
        <Card title="Recent Blogger Posts">
          {recentBloggerPosts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Belum ada artikel yang dipublish ke Blogger.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentBloggerPosts.map((article) => (
                <li
                  key={article.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{article.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDateTime(article.blogger_published_at ?? article.created_at)}
                    </p>
                  </div>
                  {article.blogger_url && (
                    <a
                      href={article.blogger_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      Lihat <ExternalLink className="h-3.5 w-3.5" />
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

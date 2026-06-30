'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Globe, Rss, Upload, AlertTriangle, Clock } from 'lucide-react'
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
  const [toggling, setToggling] = useState(false)
  // Target value of the in-flight toggle, so only the clicked button spins.
  const [pending, setPending] = useState<boolean | null>(null)

  async function loadData() {
    try {
      const [articlesRes, keywordsRes, logsRes, statusRes] = await Promise.all([
        fetch('/api/articles', { cache: 'no-store' }),
        fetch('/api/keywords', { cache: 'no-store' }),
        fetch('/api/cron/logs', { cache: 'no-store' }),
        fetch('/api/cron/status', { cache: 'no-store' })
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

  async function handleToggle(enabled: boolean) {
    setToggling(true)
    setPending(enabled)
    try {
      const res = await fetch('/api/cron/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ enabled })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        const saved = json.data?.enabled ?? enabled
        toast.success(saved ? 'Auto-pilot diaktifkan' : 'Auto-pilot dihentikan')
        // Refresh stats first, then make the just-saved value authoritative
        // for the label so it always reflects the action you clicked.
        await loadData()
        setCronStatus((prev) => (prev ? { ...prev, enabled: saved } : prev))
      } else {
        toast.error(json.error ?? 'Gagal mengubah status auto-pilot')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status auto-pilot')
    } finally {
      setToggling(false)
      setPending(null)
    }
  }

  const stats = useMemo(() => {
    const generated = articles.filter((a) => a.status === 'generated').length
    const keywordsUsed = keywords.filter((k) => k.status === 'done').length
    const keywordsLeft = keywords.filter((k) => k.status === 'unused').length
    const wpPublished = articles.filter((a) => a.wp_url).length
    const bloggerPublished = articles.filter((a) => a.blogger_url).length
    const devtoPublished = articles.filter((a) => a.devto_url).length
    const notPublished = articles.filter((a) => !a.wp_url && !a.blogger_url && !a.devto_url).length
    return {
      generated,
      keywordsUsed,
      keywordsLeft,
      wpPublished,
      bloggerPublished,
      devtoPublished,
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

  const recentDevtoPosts = useMemo(
    () =>
      articles
        .filter((a) => a.devto_url)
        .sort(
          (a, b) =>
            new Date(b.devto_published_at ?? b.created_at).getTime() -
            new Date(a.devto_published_at ?? a.created_at).getTime()
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
    { label: 'Total Artikel', value: stats.total },
    { label: 'Siap Publish', value: stats.generated },
    { label: 'Keyword Dipakai', value: stats.keywordsUsed },
    { label: 'Keyword Tersisa', value: stats.keywordsLeft }
  ]

  return (
    <>
      <Header title="Analytics" subtitle="Statistik produksi konten dari Supabase" />

      <div className="space-y-5 p-4 sm:p-6">
        {/* Stats overview */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {overviewCards.map((c) => (
            <div key={c.label} className="rounded-2xl border border-gray-100 bg-white p-4">
              <p className="text-xs text-[#6B7280]">{c.label}</p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-[#111111]">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: <Globe className="h-4 w-4 text-[#6B7280]" strokeWidth={1.8} />, label: 'WordPress', value: stats.wpPublished },
            { icon: <Rss className="h-4 w-4 text-[#6B7280]" strokeWidth={1.8} />, label: 'Blogger', value: stats.bloggerPublished },
            {
              icon: (
                <div className="flex h-4 w-4 items-center justify-center rounded bg-[#111111] text-[9px] font-bold text-white">
                  D
                </div>
              ),
              label: 'Dev.to',
              value: stats.devtoPublished
            },
            { icon: <Upload className="h-4 w-4 text-[#6B7280]" strokeWidth={1.8} />, label: 'Belum publish', value: stats.notPublished },
          ].map(({ icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4">
              {icon}
              <p className="mt-2 text-xl font-semibold tracking-tight text-[#111111]">{value}</p>
              <p className="mt-0.5 text-xs text-[#6B7280]">{label}</p>
            </div>
          ))}
        </div>

        {/* Auto-pilot workflow */}
        {cronStatus &&
          (() => {
            const enabled = cronStatus.enabled
            const ready = cronStatus.configured && cronStatus.bloggerReady
            const missing: string[] = []
            if (!cronStatus.configured) missing.push('CRON_SECRET belum diset di server')
            if (!cronStatus.bloggerReady) missing.push('Blogger belum terhubung')

            return (
              <Card>
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">Auto-pilot</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          !enabled
                            ? 'bg-gray-200 text-gray-600'
                            : ready
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {!enabled ? 'Dihentikan' : ready ? 'Aktif' : 'Belum siap'}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      {cronStatus.scheduleLabel}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={toggling && pending === true}
                      disabled={toggling}
                      onClick={() => handleToggle(true)}
                      className="whitespace-nowrap"
                    >
                      Aktifkan Auto-pilot
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={toggling && pending === false}
                      disabled={toggling}
                      onClick={() => handleToggle(false)}
                      className="whitespace-nowrap"
                    >
                      Stop Auto-pilot
                    </Button>
                  </div>
                </div>

                {/* Warning */}
                {!ready && enabled && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <ul className="space-y-0.5 text-xs text-amber-700">
                      {missing.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                  </div>
                )}

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
                    <th className="pb-3 pr-4 font-medium">Blogger</th>
                    <th className="pb-3 font-medium">Dev.to</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedArticles.map((article) => (
                    <tr key={article.id}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{article.title}</td>
                      <td className="py-3 pr-4 text-gray-500">{article.keyword}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          status={
                            article.status === 'generated' && !article.wp_url && !article.blogger_url
                              ? 'generated_unposted'
                              : article.status
                          }
                        />
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
                      <td className="py-3 pr-4">
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
                      <td className="py-3">
                        {article.devto_url ? (
                          <a
                            href={article.devto_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-[#111111] hover:text-gray-600"
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
                    <Badge
                      status={
                        article.status === 'generated' && !article.wp_url && !article.blogger_url
                          ? 'generated_unposted'
                          : article.status
                      }
                    />
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
                    {article.devto_url && (
                      <a
                        href={article.devto_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#111111] hover:text-gray-600"
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-[#111111] text-[8px] font-bold text-white">D</span> Dev.to
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

        {/* Recent Dev.to posts */}
        <Card title="Recent Dev.to Posts">
          {recentDevtoPosts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              Belum ada artikel yang dipublish ke Dev.to.
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentDevtoPosts.map((article) => (
                <li
                  key={article.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{article.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDateTime(article.devto_published_at ?? article.created_at)}
                    </p>
                  </div>
                  {article.devto_url && (
                    <a
                      href={article.devto_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#111111] hover:text-gray-600"
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

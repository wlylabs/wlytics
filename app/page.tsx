'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  CheckCircle,
  Search,
  Sparkles,
  type LucideIcon
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { Article, DashboardStats } from '@/types'

type StatCard = {
  label: string
  value: number
  icon: LucideIcon
  color: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, articlesRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/articles')
        ])
        const statsJson = await statsRes.json()
        const articlesJson = await articlesRes.json()

        if (statsJson.success) setStats(statsJson.data)
        if (articlesJson.success) setArticles(articlesJson.data ?? [])
      } catch (err) {
        console.error('Failed to load dashboard', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Overview performa wlytics kamu" badge="Niche: Teknologi" />
        <div className="space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
            <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </>
    )
  }

  const statCards: StatCard[] = [
    {
      label: 'Total Artikel',
      value: stats?.total_articles ?? 0,
      icon: FileText,
      color: 'text-violet-600 bg-violet-50'
    },
    {
      label: 'Published',
      value: stats?.published ?? 0,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50'
    },
    {
      label: 'Keywords Tersedia',
      value: stats?.unused_keywords ?? 0,
      icon: Search,
      color: 'text-orange-600 bg-orange-50'
    }
  ]

  const recentArticles = articles.slice(0, 5)

  return (
    <>
      <Header title="Dashboard" subtitle="Overview performa wlytics kamu" badge="Niche: Teknologi" />

      <div className="space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
          <Card>
            <div className="flex items-center gap-2 text-gray-900">
              <Search className="h-5 w-5 text-violet-600" />
              <h3 className="text-lg font-semibold">Research Keywords</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">Generate 10 keyword teknologi baru</p>
            <Link href="/keywords" className="mt-4 inline-block">
              <Button variant="primary">Mulai Research</Button>
            </Link>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-gray-900">
              <Sparkles className="h-5 w-5 text-violet-600" />
              <h3 className="text-lg font-semibold">Generate Artikel</h3>
            </div>
            <p className="mt-1 text-sm text-gray-500">Buat artikel dari keyword yang ada</p>
            <Link href="/generate" className="mt-4 inline-block">
              <Button variant="primary">Generate Sekarang</Button>
            </Link>
          </Card>
        </div>

        {/* Recent articles */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Artikel Terbaru</h3>
            <Link href="/articles" className="text-sm font-medium text-violet-600 hover:text-violet-700">
              Lihat Semua →
            </Link>
          </div>

          {recentArticles.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Belum ada artikel.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-4 font-medium">Judul</th>
                      <th className="pb-3 pr-4 font-medium">Keyword</th>
                      <th className="pb-3 pr-4 font-medium">Status</th>
                      <th className="pb-3 font-medium">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentArticles.map((article) => (
                      <tr key={article.id}>
                        <td className="py-3 pr-4 font-medium text-gray-900">{article.title}</td>
                        <td className="py-3 pr-4 text-gray-500">{article.keyword}</td>
                        <td className="py-3 pr-4">
                          <Badge status={article.status} />
                        </td>
                        <td className="py-3 text-gray-500">{formatDate(article.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-gray-50 sm:hidden">
                {recentArticles.map((article) => (
                  <li key={article.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/articles/${article.id}`}
                        className="font-medium text-gray-900 hover:text-violet-600"
                      >
                        {article.title}
                      </Link>
                      <Badge status={article.status} />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {article.keyword} · {formatDate(article.created_at)}
                    </p>
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

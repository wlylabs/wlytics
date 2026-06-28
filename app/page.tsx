'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  CheckCircle,
  Search,
  Sparkles,
  ArrowRight,
  type LucideIcon
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { Article, DashboardStats } from '@/types'

type StatCard = {
  label: string
  value: number
  icon: LucideIcon
  tile: string
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
  const [greeting, setGreeting] = useState('Selamat datang')

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(
      h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 19 ? 'Selamat sore' : 'Selamat malam'
    )
  }, [])

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

  const statCards: StatCard[] = [
    {
      label: 'Total Artikel',
      value: stats?.total_articles ?? 0,
      icon: FileText,
      tile: 'bg-violet-100 text-violet-600'
    },
    {
      label: 'Terbit',
      value: stats?.published ?? 0,
      icon: CheckCircle,
      tile: 'bg-green-100 text-green-600'
    },
    {
      label: 'Keyword Tersedia',
      value: stats?.unused_keywords ?? 0,
      icon: Search,
      tile: 'bg-orange-100 text-orange-600'
    }
  ]

  const recentArticles = articles.slice(0, 5)

  return (
    <>
      <Header title="Dashboard" subtitle="Overview performa wlytics kamu" badge="Niche: Teknologi" />

      <div className="space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-6 text-white sm:p-8">
          <div className="relative z-10 max-w-xl">
            <p className="text-sm text-violet-100">{greeting}, wly</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Kelola content farm kamu
            </h2>
            <p className="mt-2 text-sm text-violet-100">
              Riset keyword, generate artikel SEO, dan publish otomatis ke WordPress & Blogger —
              semua dari satu tempat.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/generate"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition-transform active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                Generate Artikel
              </Link>
              <Link
                href="/keywords"
                className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-white/25"
              >
                <Search className="h-4 w-4" />
                Research Keyword
              </Link>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
              ))
            : statCards.map(({ label, value, icon: Icon, tile }) => (
                <Card key={label}>
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tile}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{label}</p>
                      <p className="text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
                    </div>
                  </div>
                </Card>
              ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
          {[
            {
              href: '/keywords',
              icon: Search,
              title: 'Research Keywords',
              desc: 'Generate 10 keyword teknologi baru',
              tile: 'bg-orange-100 text-orange-600'
            },
            {
              href: '/generate',
              icon: Sparkles,
              title: 'Generate Artikel',
              desc: 'Buat artikel dari keyword yang ada',
              tile: 'bg-violet-100 text-violet-600'
            }
          ].map(({ href, icon: Icon, title, desc, tile }) => (
            <Link key={href} href={href} className="group">
              <Card className="flex items-center gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tile}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">{desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-violet-600" />
              </Card>
            </Link>
          ))}
        </div>

        {/* Recent articles */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Artikel Terbaru</h3>
            <Link
              href="/articles"
              className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              Lihat Semua <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : recentArticles.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Belum ada artikel.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentArticles.map((article) => (
                <li key={article.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/articles/${article.id}`}
                      className="line-clamp-1 font-medium text-gray-900 hover:text-violet-600"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {article.keyword} · {formatDate(article.created_at)}
                    </p>
                  </div>
                  <Badge status={article.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

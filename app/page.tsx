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
    { label: 'Total Artikel', value: stats?.total_articles ?? 0, icon: FileText },
    { label: 'Terbit', value: stats?.published ?? 0, icon: CheckCircle },
    { label: 'Keyword Tersedia', value: stats?.unused_keywords ?? 0, icon: Search },
  ]

  const recentArticles = articles.slice(0, 5)

  return (
    <>
      <Header title="Dashboard" badge="Teknologi" />

      <div className="space-y-5 p-4 sm:p-6">
        {/* Greeting */}
        <div className="pt-1">
          <p className="text-sm text-[#6B7280]">{greeting},</p>
          <h2 className="mt-0.5 text-2xl font-semibold tracking-tight text-[#111111]">
            Kelola content farm kamu
          </h2>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/generate">
            <div className="flex h-24 flex-col justify-between rounded-2xl bg-[#111111] p-4 transition-opacity active:opacity-80">
              <Sparkles className="h-5 w-5 text-white" strokeWidth={1.8} />
              <span className="text-sm font-medium text-white">Generate Artikel</span>
            </div>
          </Link>
          <Link href="/keywords">
            <div className="flex h-24 flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:bg-gray-50 active:bg-gray-100">
              <Search className="h-5 w-5 text-[#6B7280]" strokeWidth={1.8} />
              <span className="text-sm font-medium text-[#111111]">Research Keyword</span>
            </div>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
              ))
            : statCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4">
                  <Icon className="h-4 w-4 text-[#6B7280]" strokeWidth={1.8} />
                  <p className="mt-2 text-xl font-semibold tracking-tight text-[#111111]">{value}</p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">{label}</p>
                </div>
              ))}
        </div>

        {/* Recent articles */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111111]">Artikel Terbaru</h3>
            <Link
              href="/articles"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#111111]"
            >
              Lihat Semua <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : recentArticles.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6B7280]">Belum ada artikel.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentArticles.map((article) => (
                <li key={article.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/articles/${article.id}`}
                      className="line-clamp-1 text-sm font-medium text-[#111111] hover:opacity-70"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
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

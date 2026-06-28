'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import { ArrowLeft, ExternalLink, Trash2, Globe, Rss, Check, X } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PublishMenu from '@/components/publish/PublishMenu'
import { scoreArticle } from '@/lib/seo'
import type { Article } from '@/types'

const META_TITLE_LIMIT = 60
const META_DESC_LIMIT = 155

const markdownComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-4 mt-8 text-2xl font-bold tracking-tight text-gray-900" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-3 mt-8 text-xl font-bold tracking-tight text-gray-900" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold text-gray-800" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-5 text-[15px] leading-7 text-gray-700" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-gray-900" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-5 list-disc space-y-1.5 pl-5 text-[15px] leading-7 text-gray-700" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-[15px] leading-7 text-gray-700" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="my-5 border-l-2 border-violet-300 pl-4 italic text-gray-600" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="font-medium text-violet-600 underline decoration-violet-300 underline-offset-2 hover:text-violet-700"
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-left text-sm" {...props} />
    </div>
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-gray-50 text-gray-700" {...props} />
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th className="border-b border-gray-200 px-3 py-2 font-semibold" {...props} />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="border-b border-gray-100 px-3 py-2 text-gray-600" {...props} />
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function ArticleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Editable SEO fields
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [slug, setSlug] = useState('')
  const [kategori, setKategori] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/articles/${params.id}`)
        const json = await res.json()
        if (json.success && json.data) {
          const a = json.data as Article
          setArticle(a)
          setMetaTitle(a.meta_title ?? '')
          setMetaDescription(a.meta_description ?? '')
          setSlug(a.slug ?? '')
          setKategori(a.kategori ?? '')
          setTags((a.tags ?? []).join(', '))
        } else {
          setNotFound(true)
        }
      } catch (err) {
        console.error(err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  async function handleSave() {
    if (!article) return
    setSaving(true)
    const tagsArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    try {
      const res = await fetch('/api/articles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: article.id,
          meta_title: metaTitle,
          meta_description: metaDescription,
          slug,
          kategori,
          tags: tagsArray
        })
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Perubahan disimpan')
        setArticle((prev) =>
          prev
            ? {
                ...prev,
                meta_title: metaTitle,
                meta_description: metaDescription,
                slug,
                kategori,
                tags: tagsArray
              }
            : prev
        )
      } else {
        toast.error(json.error ?? 'Gagal menyimpan perubahan')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!article) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/articles/${article.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Artikel dihapus')
        router.push('/articles')
      } else {
        toast.error(json.error ?? 'Gagal menghapus artikel')
        setDeleting(false)
        setDeleteOpen(false)
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal menghapus artikel')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const seoReport = useMemo(
    () =>
      article
        ? scoreArticle({
            content: article.content,
            keyword: article.keyword,
            meta_title: metaTitle,
            meta_description: metaDescription,
            word_count: article.word_count
          })
        : null,
    [article, metaTitle, metaDescription]
  )

  if (loading) {
    return (
      <>
        <Header title="Detail Artikel" />
        <Loader text="Memuat artikel..." />
      </>
    )
  }

  if (notFound || !article) {
    return (
      <>
        <Header title="Detail Artikel" />
        <div className="p-4 sm:p-6 lg:p-8">
          <Card>
            <p className="text-sm text-gray-500">Artikel tidak ditemukan.</p>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => router.push('/articles')}>
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Button>
            </div>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={article.title} subtitle={`Keyword: ${article.keyword}`} />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Top action bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => router.push('/articles')}>
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <Badge status={article.status} />
            {article.wp_url && (
              <a
                href={article.wp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <Globe className="h-4 w-4" />
                WordPress
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {article.blogger_url && (
              <a
                href={article.blogger_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                <Rss className="h-4 w-4" />
                Blogger
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {!(article.wp_url && article.blogger_url) && (
              <PublishMenu
                article={article}
                size="md"
                onUpdated={(patch) => setArticle((prev) => (prev ? { ...prev, ...patch } : prev))}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Meta info bar */}
            <Card>
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Keyword</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{article.keyword}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Kategori</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{article.kategori}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Word count</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{article.word_count}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Tanggal</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{formatDate(article.created_at)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Tags</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {article.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Article body */}
            <Card>
              <article className="max-w-none">
                <ReactMarkdown components={markdownComponents}>{article.content}</ReactMarkdown>
              </article>
            </Card>
          </div>

          {/* SEO panel */}
          <div className="lg:col-span-1">
            <Card title="Meta SEO">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Meta Title</label>
                  <input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <p
                    className={`mt-1 text-xs ${
                      metaTitle.length > META_TITLE_LIMIT ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    {metaTitle.length}/{META_TITLE_LIMIT} karakter
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Meta Description</label>
                  <textarea
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <p
                    className={`mt-1 text-xs ${
                      metaDescription.length > META_DESC_LIMIT ? 'text-red-500' : 'text-gray-400'
                    }`}
                  >
                    {metaDescription.length}/{META_DESC_LIMIT} karakter
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Slug</label>
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Kategori</label>
                  <input
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="pisahkan dengan koma"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Pisahkan tiap tag dengan koma.</p>
                </div>

                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={saving}
                  disabled={saving}
                  className="w-full"
                >
                  Simpan Perubahan
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setDeleteOpen(true)}
                  className="w-full text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Artikel
                </Button>
              </div>
            </Card>

            {/* SEO score */}
            {seoReport && (
              <Card title="Skor SEO" className="mt-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
                      seoReport.score >= 80
                        ? 'bg-green-500'
                        : seoReport.score >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                  >
                    {seoReport.score}
                  </div>
                  <p className="text-sm text-gray-500">
                    {seoReport.checks.filter((c) => c.pass).length}/{seoReport.checks.length} kriteria
                    terpenuhi
                  </p>
                </div>

                <ul className="mt-4 space-y-2">
                  {seoReport.checks.map((c) => (
                    <li key={c.label} className="flex items-start gap-2 text-sm">
                      {c.pass ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      )}
                      <span className={c.pass ? 'text-gray-700' : 'text-gray-700'}>
                        {c.label}
                        {!c.pass && <span className="block text-xs text-gray-400">{c.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus Artikel"
        description="Artikel ini akan dihapus permanen dan tidak bisa dikembalikan. Lanjutkan?"
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}

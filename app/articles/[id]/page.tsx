'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import { ArrowLeft, ExternalLink, Upload, Trash2 } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { parseJson } from '@/lib/http'

const META_TITLE_LIMIT = 60
const META_DESC_LIMIT = 155
import type { Article } from '@/types'

const markdownComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-4 mt-6 text-2xl font-bold text-gray-900" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-3 mt-6 text-xl font-semibold text-gray-900" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-2 mt-4 text-lg font-semibold text-gray-800" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 leading-relaxed text-gray-700" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-gray-900" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 list-disc space-y-1 pl-6 text-gray-700" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 list-decimal space-y-1 pl-6 text-gray-700" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-indigo-600 underline hover:text-indigo-700" {...props} />
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
  const [publishing, setPublishing] = useState(false)
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

  async function handlePublish() {
    if (!article) return
    setPublishing(true)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id })
      })
      const json = await parseJson<{ success: boolean; wp_url?: string; error?: string }>(res)
      if (json.success) {
        toast.success('Artikel berhasil dipublish!')
        setArticle((prev) =>
          prev ? { ...prev, status: 'published', wp_url: json.wp_url } : prev
        )
      } else {
        toast.error(json.error ?? 'Gagal publish artikel')
      }
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Gagal publish artikel')
    } finally {
      setPublishing(false)
    }
  }

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

  const isPublished = article.status === 'published'

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

          <div className="flex items-center gap-3">
            <Badge status={article.status} />
            {isPublished && article.wp_url ? (
              <a
                href={article.wp_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Lihat di WordPress
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <Button variant="primary" onClick={handlePublish} loading={publishing} disabled={publishing}>
                <Upload className="h-4 w-4" />
                Publish ke WordPress
              </Button>
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
                  <dt className="text-gray-400">Keyword</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{article.keyword}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Kategori</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{article.kategori}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Word count</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{article.word_count}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Tanggal</dt>
                  <dd className="mt-0.5 font-medium text-gray-800">{formatDate(article.created_at)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-gray-400">Tags</dt>
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
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Kategori</label>
                  <input
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="pisahkan dengan koma"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

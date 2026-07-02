'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Rss, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { parseJson } from '@/lib/http'
import type { Article } from '@/types'

interface PublishMenuProps {
  article: Article
  size?: 'sm' | 'md' | 'lg'
  onUpdated: (patch: Partial<Article>) => void
}

export default function PublishMenu({ article, size = 'sm', onUpdated }: PublishMenuProps) {
  const [publishing, setPublishing] = useState(false)

  async function publishBlogger() {
    setPublishing(true)
    try {
      const res = await fetch('/api/publish/blogger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id })
      })
      const json = await parseJson<{ success: boolean; blogger_url?: string; error?: string }>(res)
      if (json.success) {
        toast.success('Dipublish ke Blogger!')
        onUpdated({ blogger_url: json.blogger_url })
      } else {
        toast.error(json.error ?? 'Gagal publish ke Blogger')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal publish ke Blogger')
    } finally {
      setPublishing(false)
    }
  }

  if (article.blogger_url) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
        <Check className="h-4 w-4" /> Sudah di Blogger
      </span>
    )
  }

  return (
    <Button variant="primary" size={size} loading={publishing} disabled={publishing} onClick={publishBlogger}>
      <Rss className="h-4 w-4" />
      Publish ke Blogger
    </Button>
  )
}

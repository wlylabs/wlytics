'use client'

import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import toast from 'react-hot-toast'
import { Upload, ChevronDown, Globe, Rss, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { parseJson } from '@/lib/http'
import type { Article } from '@/types'

interface PublishMenuProps {
  article: Article
  size?: 'sm' | 'md' | 'lg'
  onUpdated: (patch: Partial<Article>) => void
}

export default function PublishMenu({ article, size = 'sm', onUpdated }: PublishMenuProps) {
  const [publishing, setPublishing] = useState<null | 'wp' | 'blogger'>(null)

  async function publishWordPress() {
    setPublishing('wp')
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: article.id })
      })
      const json = await parseJson<{ success: boolean; wp_url?: string; error?: string }>(res)
      if (json.success) {
        toast.success('Dipublish ke WordPress!')
        onUpdated({ status: 'published', wp_url: json.wp_url })
      } else {
        toast.error(json.error ?? 'Gagal publish ke WordPress')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal publish ke WordPress')
    } finally {
      setPublishing(null)
    }
  }

  async function publishBlogger() {
    setPublishing('blogger')
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
      setPublishing(null)
    }
  }

  const itemClass =
    'flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none data-[highlighted]:bg-gray-100 data-[disabled]:cursor-default data-[disabled]:text-gray-400'

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button
          variant="primary"
          size={size}
          loading={publishing !== null}
          disabled={publishing !== null}
        >
          <Upload className="h-4 w-4" />
          Publish
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[210px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg duration-150 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item
            className={itemClass}
            disabled={!!article.wp_url}
            onSelect={publishWordPress}
          >
            <Globe className="h-4 w-4 text-blue-600" />
            {article.wp_url ? (
              <span className="flex items-center gap-1">
                Sudah di WordPress <Check className="h-3.5 w-3.5 text-green-600" />
              </span>
            ) : (
              'Publish ke WordPress'
            )}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={itemClass}
            disabled={!!article.blogger_url}
            onSelect={publishBlogger}
          >
            <Rss className="h-4 w-4 text-orange-600" />
            {article.blogger_url ? (
              <span className="flex items-center gap-1">
                Sudah di Blogger <Check className="h-3.5 w-3.5 text-green-600" />
              </span>
            ) : (
              'Publish ke Blogger'
            )}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

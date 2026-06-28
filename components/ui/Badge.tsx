import type { ArticleStatus, KeywordStatus } from '@/types'

interface BadgeProps {
  status: ArticleStatus | KeywordStatus | string
}

type Conf = { label: string; cls: string; dot: string }

const CONFIG: Record<string, Conf> = {
  // keyword
  unused: { label: 'Tersedia', cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  in_progress: { label: 'Diproses', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  done: { label: 'Terpakai', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  // article
  draft: { label: 'Draf', cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  generated: { label: 'Siap publish', cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  reviewed: { label: 'Direview', cls: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  published: { label: 'Terbit', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' }
}

const FALLBACK: Conf = { label: '', cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }

export default function Badge({ status }: BadgeProps) {
  const conf = CONFIG[status] ?? { ...FALLBACK, label: status }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${conf.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      {conf.label}
    </span>
  )
}

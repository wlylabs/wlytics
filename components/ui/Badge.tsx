import type { ArticleStatus, KeywordStatus } from '@/types'

interface BadgeProps {
  status: ArticleStatus | KeywordStatus | string
}

type Conf = { label: string; cls: string }

const CONFIG: Record<string, Conf> = {
  // keyword
  unused:             { label: 'Tersedia',       cls: 'bg-gray-100 text-[#6B7280]' },
  in_progress:        { label: 'Diproses',        cls: 'bg-amber-50 text-amber-700' },
  done:               { label: 'Terpakai',        cls: 'bg-green-50 text-green-700' },
  // article
  draft:              { label: 'Draf',            cls: 'bg-gray-100 text-[#6B7280]' },
  generated:          { label: 'Siap publish',    cls: 'bg-blue-50 text-blue-700' },
  generated_unposted: { label: 'Belum diposting', cls: 'bg-orange-50 text-orange-600' },
  reviewed:           { label: 'Direview',        cls: 'bg-purple-50 text-purple-700' },
  published:          { label: 'Terbit',          cls: 'bg-green-50 text-green-700' },
}

const FALLBACK: Conf = { label: '', cls: 'bg-gray-100 text-[#6B7280]' }

export default function Badge({ status }: BadgeProps) {
  const conf = CONFIG[status] ?? { ...FALLBACK, label: status }

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${conf.cls}`}
    >
      {conf.label}
    </span>
  )
}

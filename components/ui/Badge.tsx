import type { ArticleStatus, KeywordStatus } from '@/types'

interface BadgeProps {
  status: ArticleStatus | KeywordStatus | string
}

const colorClasses: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  done: 'bg-green-100 text-green-700',
  generated: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  draft: 'bg-gray-100 text-gray-600',
  unused: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-purple-100 text-purple-700'
}

// Human-readable Indonesian labels so non-technical users aren't confused by
// raw statuses like "unused" / "in_progress".
const labels: Record<string, string> = {
  // keyword
  unused: 'Belum dipakai',
  in_progress: 'Sedang diproses',
  done: 'Sudah dipakai',
  // article
  draft: 'Draf',
  generated: 'Siap publish',
  reviewed: 'Direview',
  published: 'Terbit'
}

export default function Badge({ status }: BadgeProps) {
  const color = colorClasses[status] ?? 'bg-gray-100 text-gray-600'
  const label = labels[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {label}
    </span>
  )
}

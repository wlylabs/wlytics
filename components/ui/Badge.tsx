import type { ArticleStatus, KeywordStatus } from '@/types'

interface BadgeProps {
  status: ArticleStatus | KeywordStatus | string
}

const colorClasses: Record<string, string> = {
  published: 'bg-green-100 text-green-700',
  done: 'bg-green-100 text-green-700',
  generated: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  draft: 'bg-gray-100 text-gray-600',
  unused: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-purple-100 text-purple-700'
}

const labels: Record<string, string> = {
  in_progress: 'in progress'
}

export default function Badge({ status }: BadgeProps) {
  const color = colorClasses[status] ?? 'bg-gray-100 text-gray-600'
  const label = labels[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}
    >
      {label}
    </span>
  )
}

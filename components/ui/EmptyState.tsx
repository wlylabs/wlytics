import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <Icon className="h-7 w-7 text-[#6B7280]" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-[#111111]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#6B7280]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

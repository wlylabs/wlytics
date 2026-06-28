import { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)] sm:p-6 ${className}`}
    >
      {title && <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>}
      {children}
    </div>
  )
}

import { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  className?: string
}

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 ${className}`}
    >
      {title && (
        <h3 className="mb-4 text-sm font-semibold tracking-tight text-[#111111]">{title}</h3>
      )}
      {children}
    </div>
  )
}

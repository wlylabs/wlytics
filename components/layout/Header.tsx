type HeaderProps = {
  title: string
  subtitle?: string
  badge?: string
}

export default function Header({ title, subtitle, badge }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-[#111111] sm:text-xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-sm text-[#6B7280]">{subtitle}</p>
        )}
      </div>

      {badge && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-[#111111]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#111111]" />
          {badge}
        </span>
      )}
    </header>
  )
}

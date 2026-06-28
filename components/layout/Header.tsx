type HeaderProps = {
  title: string
  subtitle?: string
  badge?: string
}

export default function Header({ title, subtitle, badge }: HeaderProps) {
  return (
    <header className="sticky top-14 z-20 flex items-center justify-between gap-3 border-b border-gray-200/80 bg-white/80 px-4 py-4 backdrop-blur sm:px-8 sm:py-5 lg:top-0">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>}
      </div>

      {badge && (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200 sm:text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          {badge}
        </span>
      )}
    </header>
  )
}

type HeaderProps = {
  title: string
  subtitle?: string
  badge?: string
}

export default function Header({ title, subtitle, badge }: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-8 sm:py-5">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-sm text-gray-500">{subtitle}</p>}
      </div>

      {badge && (
        <span className="inline-flex shrink-0 items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 sm:text-sm">
          {badge}
        </span>
      )}
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  Sparkles,
  FileText,
  Upload,
  BarChart2,
  type LucideIcon
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Keywords', href: '/keywords', icon: Search },
  { label: 'Generate', href: '/generate', icon: Sparkles },
  { label: 'Artikel', href: '/articles', icon: FileText },
  { label: 'Publish', href: '/publish', icon: Upload },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 }
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col bg-gray-900 text-gray-300">
      <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6 text-lg font-semibold text-white">
        <span>🤖</span>
        <span>Content Farm</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

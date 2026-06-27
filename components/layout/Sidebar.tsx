'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  Sparkles,
  FileText,
  Upload,
  BarChart2,
  Bot,
  Menu,
  X,
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
  const [open, setOpen] = useState(false)

  const navLinks = (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
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
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu navigasi"
          className="-ml-1 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Bot className="h-5 w-5 text-indigo-600" />
          <span>Content Farm</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col bg-gray-900 text-gray-300 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6 text-lg font-semibold text-white">
          <Bot className="h-6 w-6 text-indigo-400" />
          <span>Content Farm</span>
        </div>
        {navLinks}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 max-w-[82%] flex-col bg-gray-900 text-gray-300">
            <div className="flex h-14 items-center justify-between border-b border-gray-800 px-4">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Bot className="h-5 w-5 text-indigo-400" />
                <span>Content Farm</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu navigasi"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {navLinks}
          </aside>
        </div>
      )}
    </>
  )
}

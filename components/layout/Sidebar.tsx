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
  Bot,
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
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
]

function useActive(href: string) {
  const pathname = usePathname()
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-6 py-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#111111]">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <span className="text-base font-semibold tracking-tight text-[#111111]">wlytics</span>
    </div>
  )
}

function DesktopNavItem({ label, href, icon: Icon }: NavItem) {
  const active = useActive(href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
        active
          ? 'bg-[#111111] text-white'
          : 'text-[#6B7280] hover:bg-gray-100 hover:text-[#111111]'
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />
      {label}
    </Link>
  )
}

function BottomNavItem({ href, icon: Icon, label }: NavItem) {
  const active = useActive(href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors"
    >
      <Icon
        className={`h-[22px] w-[22px] transition-colors ${
          active ? 'text-[#111111]' : 'text-[#9CA3AF]'
        }`}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <span
        className={`text-[10px] font-medium tracking-tight ${
          active ? 'text-[#111111]' : 'text-[#9CA3AF]'
        }`}
      >
        {label}
      </span>
    </Link>
  )
}

export default function Sidebar() {
  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-gray-100 bg-white lg:flex">
        <Brand />
        <div className="h-px bg-gray-100" />
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <DesktopNavItem key={item.href} {...item} />
          ))}
        </nav>
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="text-[11px] text-[#9CA3AF]">© {new Date().getFullYear()} wlytics</p>
        </div>
      </aside>

      {/* Mobile bottom navigation — hidden on desktop */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-stretch border-t border-gray-100 bg-white/95 backdrop-blur-sm lg:hidden">
        {navItems.map((item) => (
          <BottomNavItem key={item.href} {...item} />
        ))}
      </nav>
    </>
  )
}

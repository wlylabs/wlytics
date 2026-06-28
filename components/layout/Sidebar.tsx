'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
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

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map(({ label, href, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
              isActive
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Icon
              className={`h-5 w-5 shrink-0 transition-transform duration-150 ${
                isActive ? '' : 'group-hover:scale-110'
              }`}
            />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Buka menu navigasi"
              className="-ml-1 rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
          </Dialog.Trigger>

          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out data-[state=open]:fade-in lg:hidden" />
            <Dialog.Content
              className="fixed left-0 top-0 z-50 flex h-full w-64 max-w-[82%] flex-col bg-zinc-950 text-zinc-300 duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
              aria-label="Menu navigasi"
            >
              <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-4">
                <Dialog.Title className="flex items-center gap-2 font-semibold text-white">
                  <Bot className="h-5 w-5 text-violet-400" />
                  <span>wlytics</span>
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Tutup menu navigasi"
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </Dialog.Close>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Bot className="h-5 w-5 text-violet-600" />
          <span>wlytics</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col bg-zinc-950 text-zinc-300 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6 text-lg font-semibold text-white">
          <Bot className="h-6 w-6 text-violet-400" />
          <span>wlytics</span>
        </div>
        <NavLinks />
      </aside>
    </>
  )
}

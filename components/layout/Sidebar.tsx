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
  desc: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, desc: 'Ringkasan' },
  { label: 'Keywords', href: '/keywords', icon: Search, desc: 'Riset keyword' },
  { label: 'Generate', href: '/generate', icon: Sparkles, desc: 'Buat artikel' },
  { label: 'Artikel', href: '/articles', icon: FileText, desc: 'Kelola artikel' },
  { label: 'Publish', href: '/publish', icon: Upload, desc: 'WordPress & Blogger' },
  { label: 'Analytics', href: '/analytics', icon: BarChart2, desc: 'Statistik & auto-pilot' }
]

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-sm">
        <Bot className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="font-semibold text-white">wlytics</p>
        <p className="text-[11px] text-zinc-500">AI content pipeline</p>
      </div>
    </div>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-600">Menu</p>
      {navItems.map(({ label, href, icon: Icon, desc }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 active:scale-[0.98] ${
              isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/80" />
            )}
            <Icon
              className={`h-5 w-5 shrink-0 transition-transform duration-150 ${
                isActive ? '' : 'group-hover:scale-110'
              }`}
            />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{label}</span>
              <span className={`text-[11px] ${isActive ? 'text-violet-100' : 'text-zinc-600'}`}>
                {desc}
              </span>
            </span>
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
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur lg:hidden">
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
              className="fixed left-0 top-0 z-50 flex h-full w-72 max-w-[84%] flex-col bg-zinc-950 duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
              aria-label="Menu navigasi"
            >
              <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
                <Dialog.Title asChild>
                  <div>
                    <Brand />
                  </div>
                </Dialog.Title>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Tutup menu navigasi"
                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span>wlytics</span>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col bg-zinc-950 lg:flex">
        <div className="flex h-16 items-center border-b border-white/5 px-5">
          <Brand />
        </div>
        <NavLinks />
        <div className="border-t border-white/5 p-4">
          <p className="text-[11px] text-zinc-600">© {new Date().getFullYear()} wlytics</p>
        </div>
      </aside>
    </>
  )
}

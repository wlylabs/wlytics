'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

const NO_CHROME_PATHS = ['/login']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (NO_CHROME_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      {/* pb-16 = clearance for mobile bottom nav; lg:pb-0 removes it on desktop */}
      <div className="flex min-h-screen flex-col pb-16 lg:ml-64 lg:pb-0">
        <main className="flex-1">{children}</main>
      </div>
    </>
  )
}

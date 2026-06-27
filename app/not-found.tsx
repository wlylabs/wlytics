import Link from 'next/link'
import { Compass } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <Compass className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Halaman tidak ditemukan</h2>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="primary">Kembali ke Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

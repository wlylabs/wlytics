'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Terjadi kesalahan</h2>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        Maaf, ada yang tidak beres saat memuat halaman ini. Coba lagi.
      </p>
      <div className="mt-6">
        <Button variant="primary" onClick={reset}>
          Coba Lagi
        </Button>
      </div>
    </div>
  )
}

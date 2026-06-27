'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Search, Plus } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import type { Keyword } from '@/types'

function IntentBadge({ intent }: { intent: string }) {
  const color =
    intent === 'commercial'
      ? 'bg-green-100 text-green-700'
      : 'bg-blue-100 text-blue-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}>
      {intent}
    </span>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
      ))}
    </div>
  )
}

export default function KeywordsPage() {
  const router = useRouter()
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [researching, setResearching] = useState(false)

  async function loadKeywords() {
    setLoading(true)
    try {
      const res = await fetch('/api/keywords')
      const json = await res.json()
      if (json.success) setKeywords(json.data ?? [])
      else toast.error(json.error ?? 'Gagal memuat keywords')
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat keywords')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeywords()
  }, [])

  async function handleResearch() {
    setResearching(true)
    try {
      const res = await fetch('/api/keywords', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        toast.success(`Berhasil generate ${json.data?.length ?? 0} keyword baru`)
        setModalOpen(false)
        await loadKeywords()
      } else {
        toast.error(json.error ?? 'Gagal research keyword')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal research keyword')
    } finally {
      setResearching(false)
    }
  }

  function handleGenerate(keyword: Keyword) {
    const params = new URLSearchParams({
      keyword_id: keyword.id,
      keyword: keyword.keyword
    })
    router.push(`/generate?${params.toString()}`)
  }

  const stats = {
    total: keywords.length,
    unused: keywords.filter((k) => k.status === 'unused').length,
    in_progress: keywords.filter((k) => k.status === 'in_progress').length,
    done: keywords.filter((k) => k.status === 'done').length
  }

  return (
    <>
      <Header
        title="Keyword Research"
        subtitle="Kelola dan generate keyword teknologi untuk artikel"
      />

      <div className="space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8">
        <div className="flex items-center justify-end">
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Research Keyword Baru
          </Button>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total', value: stats.total },
            { label: 'Unused', value: stats.unused },
            { label: 'In Progress', value: stats.in_progress },
            { label: 'Done', value: stats.done }
          ].map((s) => (
            <Card key={s.label}>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Keywords table */}
        <Card>
          {loading ? (
            <TableSkeleton />
          ) : keywords.length === 0 ? (
            <EmptyState
              icon={Search}
              title="Belum ada keyword"
              description="Mulai dengan generate 20 keyword teknologi baru menggunakan Groq AI."
              action={
                <Button variant="primary" onClick={() => setModalOpen(true)}>
                  Research Keyword Baru
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3 pr-4 font-medium">No</th>
                    <th className="pb-3 pr-4 font-medium">Keyword</th>
                    <th className="pb-3 pr-4 font-medium">Intent</th>
                    <th className="pb-3 pr-4 font-medium">Estimasi Artikel</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {keywords.map((kw, idx) => (
                    <tr key={kw.id}>
                      <td className="py-3 pr-4 text-gray-400">{idx + 1}</td>
                      <td className="py-3 pr-4 font-medium text-gray-900">{kw.keyword}</td>
                      <td className="py-3 pr-4">
                        <IntentBadge intent={kw.intent} />
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{kw.estimasi_artikel}</td>
                      <td className="py-3 pr-4">
                        <Badge status={kw.status} />
                      </td>
                      <td className="py-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={kw.status !== 'unused'}
                          onClick={() => handleGenerate(kw)}
                        >
                          Generate Artikel
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Confirmation modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Research Keyword Baru</h3>
            <p className="mt-2 text-sm text-gray-500">
              Ini akan generate 20 keyword baru menggunakan Groq AI.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={researching}
              >
                Batal
              </Button>
              <Button variant="primary" onClick={handleResearch} loading={researching}>
                Ya, Research
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

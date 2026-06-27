'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Circle,
  RotateCcw,
  Clock
} from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import type { Article, Keyword } from '@/types'

type StepStatus = 'pending' | 'loading' | 'done' | 'error'

const STEP_LABELS = [
  'Generate Outline',
  'Generate Artikel (2000 kata)',
  'Generate Meta SEO',
  'Simpan ke Database'
]

// Estimated time (ms) at which each step visually starts, while the single
// /api/generate request runs. Final state is reconciled to the real result.
const STEP_TIMINGS = [4000, 20000, 28000]

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'loading':
      return <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
    case 'done':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case 'error':
      return <XCircle className="h-5 w-5 text-red-600" />
    default:
      return <Circle className="h-5 w-5 text-gray-300" />
  }
}

function GenerateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loadingKeywords, setLoadingKeywords] = useState(true)
  const [selectedId, setSelectedId] = useState('')

  const [generating, setGenerating] = useState(false)
  const [steps, setSteps] = useState<StepStatus[]>(['pending', 'pending', 'pending', 'pending'])
  const [result, setResult] = useState<Article | null>(null)
  const [error, setError] = useState<string | null>(null)

  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const activeStep = useRef(0)

  const queryKeywordId = searchParams.get('keyword_id')

  useEffect(() => {
    async function loadKeywords() {
      try {
        const res = await fetch('/api/keywords')
        const json = await res.json()
        if (json.success) {
          const unused = (json.data as Keyword[]).filter((k) => k.status === 'unused')
          setKeywords(unused)
        }
      } catch (err) {
        console.error(err)
        toast.error('Gagal memuat keywords')
      } finally {
        setLoadingKeywords(false)
      }
    }
    loadKeywords()
  }, [])

  // Pre-select from query param once keywords are available.
  useEffect(() => {
    if (queryKeywordId && keywords.some((k) => k.id === queryKeywordId)) {
      setSelectedId(queryKeywordId)
    }
  }, [queryKeywordId, keywords])

  // Clear any pending timers on unmount.
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout)
    }
  }, [])

  const selectedKeyword = useMemo(
    () => keywords.find((k) => k.id === selectedId) ?? null,
    [keywords, selectedId]
  )

  function setStep(index: number, status: StepStatus) {
    setSteps((prev) => {
      const next = [...prev]
      next[index] = status
      return next
    })
  }

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function startVisualProgress() {
    setSteps(['loading', 'pending', 'pending', 'pending'])
    activeStep.current = 0

    timers.current = STEP_TIMINGS.map((delay, i) =>
      setTimeout(() => {
        setStep(i, 'done')
        setStep(i + 1, 'loading')
        activeStep.current = i + 1
      }, delay)
    )
  }

  async function handleGenerate() {
    if (!selectedKeyword) return

    setGenerating(true)
    setError(null)
    setResult(null)
    startVisualProgress()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword_id: selectedKeyword.id,
          keyword: selectedKeyword.keyword
        })
      })
      const json = await res.json()

      clearTimers()

      if (json.success) {
        setSteps(['done', 'done', 'done', 'done'])
        setResult(json.data)
        toast.success('Artikel berhasil dibuat!')
      } else {
        throw new Error(json.error ?? 'Gagal generate artikel')
      }
    } catch (err) {
      clearTimers()
      setStep(activeStep.current, 'error')
      const message = err instanceof Error ? err.message : 'Gagal generate artikel'
      setError(message)
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  function resetForm() {
    clearTimers()
    setResult(null)
    setError(null)
    setSteps(['pending', 'pending', 'pending', 'pending'])
    setSelectedId('')
  }

  return (
    <>
      <Header
        title="Generate Artikel"
        subtitle="Pipeline otomatis: Outline → Artikel → Meta SEO"
      />

      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Result view */}
        {result ? (
          <Card>
            <div className="mb-4 flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Artikel berhasil dibuat</span>
            </div>

            <h2 className="text-xl font-semibold text-gray-900">{result.title}</h2>
            <p className="mt-2 text-sm text-gray-500">{result.meta_description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {result.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <p className="mt-4 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{result.word_count}</span> kata
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => router.push(`/articles/${result.id}`)}>
                Lihat Artikel Lengkap
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Generate Artikel Lain
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Keyword selector */}
            <Card title="Pilih Keyword">
              {loadingKeywords ? (
                <Loader text="Memuat keywords..." />
              ) : keywords.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Tidak ada keyword dengan status unused.{' '}
                  <button
                    onClick={() => router.push('/keywords')}
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Research keyword dulu →
                  </button>
                </p>
              ) : (
                <>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    disabled={generating}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <option value="">— Pilih keyword —</option>
                    {keywords.map((kw) => (
                      <option key={kw.id} value={kw.id}>
                        {kw.keyword}
                      </option>
                    ))}
                  </select>

                  {selectedKeyword && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
                      <p className="font-medium text-gray-900">{selectedKeyword.keyword}</p>
                      <p className="mt-1 text-gray-500">
                        Intent:{' '}
                        <span className="capitalize text-gray-700">{selectedKeyword.intent}</span>
                      </p>
                      <p className="mt-1 text-gray-500">
                        Estimasi judul:{' '}
                        <span className="text-gray-700">{selectedKeyword.estimasi_artikel}</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Pipeline progress */}
            {generating && (
              <Card title="Progress Pipeline">
                <ul className="space-y-3">
                  {STEP_LABELS.map((label, i) => (
                    <li key={label} className="flex items-center gap-3">
                      <StepIcon status={steps[i]} />
                      <span
                        className={`text-sm ${
                          steps[i] === 'pending' ? 'text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Error */}
            {error && (
              <Card>
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Gagal generate artikel</span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{error}</p>
                <div className="mt-4">
                  <Button variant="secondary" onClick={handleGenerate} disabled={!selectedKeyword}>
                    <RotateCcw className="h-4 w-4" />
                    Coba Lagi
                  </Button>
                </div>
              </Card>
            )}

            {/* Generate button */}
            <div>
              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                loading={generating}
                disabled={!selectedKeyword || generating}
                className="w-full"
              >
                <Sparkles className="h-4 w-4" />
                {generating ? 'Sedang Generate...' : 'Generate Artikel'}
              </Button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                Estimasi waktu: 30-60 detik
              </p>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<Loader text="Memuat..." />}>
      <GenerateContent />
    </Suspense>
  )
}

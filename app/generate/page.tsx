'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
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
import {
  ARTICLE_TYPES,
  DEFAULT_ARTICLE_TYPE,
  suggestArticleType,
  type ArticleTypeId
} from '@/lib/articleTypes'

type StepStatus = 'pending' | 'loading' | 'done' | 'error'

const STEP_LABELS = [
  'Generate Outline',
  'Generate Artikel (2000 kata)',
  'Generate Meta SEO',
  'Simpan ke Database'
]

type StreamEvent =
  | { type: 'step'; index: number; status: StepStatus }
  | { type: 'done'; data: Article }
  | { type: 'error'; index: number; error: string }
  | { type: 'notice'; message: string }

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case 'loading':
      return <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
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
  const [articleType, setArticleType] = useState<ArticleTypeId>(DEFAULT_ARTICLE_TYPE)
  const [typeTouched, setTypeTouched] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [steps, setSteps] = useState<StepStatus[]>(['pending', 'pending', 'pending', 'pending'])
  const [result, setResult] = useState<Article | null>(null)
  const [error, setError] = useState<string | null>(null)

  type KeyStatus = { configured: boolean; ok: boolean; message: string }
  const [apiStatus, setApiStatus] = useState<{ groq: KeyStatus; gemini: KeyStatus } | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setApiStatus(j.data)
      })
      .catch(() => {})
  }, [])

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

  const selectedKeyword = useMemo(
    () => keywords.find((k) => k.id === selectedId) ?? null,
    [keywords, selectedId]
  )

  // Suggested type from the chosen keyword (text + intent).
  const suggestedType = useMemo(
    () =>
      selectedKeyword
        ? suggestArticleType(selectedKeyword.keyword, selectedKeyword.intent)
        : null,
    [selectedKeyword]
  )

  // Auto-apply the suggestion when the keyword changes, unless the user has
  // manually picked a type.
  useEffect(() => {
    if (suggestedType && !typeTouched) setArticleType(suggestedType)
  }, [suggestedType, typeTouched])

  function applyEvent(event: StreamEvent) {
    if (event.type === 'notice') {
      toast(event.message, { icon: 'ℹ️' })
    } else if (event.type === 'step') {
      setSteps((prev) => {
        const next = [...prev]
        next[event.index] = event.status
        return next
      })
    } else if (event.type === 'done') {
      setSteps(['done', 'done', 'done', 'done'])
      setResult(event.data)
      toast.success('Artikel berhasil dibuat!')
    } else if (event.type === 'error') {
      setSteps((prev) => {
        const next = [...prev]
        next[event.index] = 'error'
        return next
      })
      setError(event.error)
      toast.error(event.error)
    }
  }

  async function handleGenerate() {
    if (!selectedKeyword) return

    setGenerating(true)
    setError(null)
    setResult(null)
    setSteps(['pending', 'pending', 'pending', 'pending'])

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword_id: selectedKeyword.id,
          keyword: selectedKeyword.keyword,
          article_type: articleType
        })
      })

      if (!res.ok || !res.body) {
        throw new Error('Gagal terhubung ke server generate')
      }

      // Read the NDJSON stream and apply each event as it arrives.
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim()) applyEvent(JSON.parse(line) as StreamEvent)
        }
      }
      if (buffer.trim()) applyEvent(JSON.parse(buffer) as StreamEvent)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal generate artikel'
      setError(message)
      toast.error(message)
    } finally {
      setGenerating(false)
    }
  }

  function resetForm() {
    setResult(null)
    setError(null)
    setSteps(['pending', 'pending', 'pending', 'pending'])
    setSelectedId('')
    setTypeTouched(false)
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
            {/* API key status */}
            {apiStatus && (
              <Card>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                  <span className="text-sm font-medium text-gray-700">Status API</span>
                  {(['groq', 'gemini'] as const).map((key) => {
                    const s = apiStatus[key]
                    const color = s.ok
                      ? 'bg-green-500'
                      : s.configured
                        ? 'bg-red-500'
                        : 'bg-gray-300'
                    return (
                      <span key={key} className="flex items-center gap-2 text-sm">
                        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                        <span className="font-medium capitalize text-gray-800">{key}</span>
                        <span className="text-gray-400">— {s.message}</span>
                      </span>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Keyword selector */}
            <Card title="Pilih Keyword">
              {loadingKeywords ? (
                <Loader text="Memuat keywords..." />
              ) : keywords.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Semua keyword sudah dipakai.{' '}
                  <button
                    onClick={() => router.push('/keywords')}
                    className="font-medium text-violet-600 hover:text-violet-700"
                  >
                    Research keyword baru dulu →
                  </button>
                </p>
              ) : (
                <>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    disabled={generating}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
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

            {/* Article type selector */}
            <Card title="Jenis Artikel">
              {suggestedType && (
                <p className="mb-3 text-xs text-gray-500">
                  Disarankan otomatis berdasarkan keyword{' '}
                  {selectedKeyword?.intent ? `(intent ${selectedKeyword.intent})` : ''}. Kamu tetap
                  bisa mengubahnya.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ARTICLE_TYPES.map((type) => {
                  const isSelected = articleType === type.id
                  const isSuggested = suggestedType === type.id
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setArticleType(type.id)
                        setTypeTouched(true)
                      }}
                      disabled={generating}
                      aria-pressed={isSelected}
                      className={`rounded-lg border p-4 text-left transition-all duration-150 active:scale-[0.99] disabled:opacity-50 ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium text-gray-900">
                          {type.label}
                          {isSuggested && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                              Disarankan
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isSelected ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {type.wordTarget}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{type.description}</p>
                    </button>
                  )
                })}
              </div>
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

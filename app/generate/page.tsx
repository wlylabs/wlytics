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
      return <Loader2 className="h-5 w-5 animate-spin text-[#111111]" />
    case 'done':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <Circle className="h-5 w-5 text-gray-200" />
  }
}

function statusText(status: StepStatus): string {
  switch (status) {
    case 'loading':
      return 'Sedang diproses…'
    case 'done':
      return 'Selesai'
    case 'error':
      return 'Gagal'
    default:
      return 'Menunggu'
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

  type KeyStatus = { configured: boolean; available: boolean; message: string }
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
      // Model fallback (e.g. Groq -> Gemini) is silent — no popup. Only a real
      // error should surface a toast.
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

            <h2 className="text-xl font-semibold text-[#111111]">{result.title}</h2>
            <p className="mt-2 text-sm text-[#6B7280]">{result.meta_description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {result.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-[#6B7280]"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <p className="mt-4 text-sm text-[#6B7280]">
              <span className="font-medium text-[#111111]">{result.word_count}</span> kata
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
            {/* API limit status */}
            {apiStatus && (
              <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 sm:px-5">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                  Status API
                </p>
                <div className="flex flex-col gap-2">
                  {(['groq', 'gemini'] as const).map((key) => {
                    const s = apiStatus[key]
                    const dot = s.available
                      ? 'bg-green-500'
                      : s.configured
                        ? 'bg-red-400'
                        : 'bg-gray-300'
                    const label = key === 'groq' ? 'Groq' : 'Gemini'
                    const sub = key === 'groq' ? 'utama' : 'cadangan'
                    return (
                      <div key={key} className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                        <span className="text-sm text-[#111111]">
                          {label}
                          <span className="ml-1 text-xs text-[#6B7280]">({sub})</span>
                        </span>
                        <span className="ml-auto text-xs text-[#6B7280]">{s.message}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Keyword selector */}
            <Card title="Pilih Keyword">
              {loadingKeywords ? (
                <Loader text="Memuat keywords..." />
              ) : keywords.length === 0 ? (
                <p className="text-sm text-[#6B7280]">
                  Semua keyword sudah dipakai.{' '}
                  <button
                    onClick={() => router.push('/keywords')}
                    className="font-medium text-[#111111] underline underline-offset-2"
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
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#111111] focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:opacity-50"
                  >
                    <option value="">— Pilih keyword —</option>
                    {keywords.map((kw) => (
                      <option key={kw.id} value={kw.id}>
                        {kw.keyword}
                      </option>
                    ))}
                  </select>

                  {selectedKeyword && (
                    <div className="mt-3 rounded-xl bg-gray-50 p-3.5 text-sm">
                      <p className="font-medium text-[#111111]">{selectedKeyword.keyword}</p>
                      <p className="mt-1 text-[#6B7280]">
                        Intent:{' '}
                        <span className="capitalize text-[#111111]">{selectedKeyword.intent}</span>
                      </p>
                      <p className="mt-1 text-[#6B7280]">
                        Estimasi judul:{' '}
                        <span className="text-[#111111]">{selectedKeyword.estimasi_artikel}</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Article type selector */}
            <Card title="Jenis Artikel">
              {suggestedType && (
                <p className="mb-3 text-xs text-[#6B7280]">
                  Disarankan otomatis berdasarkan keyword{selectedKeyword?.intent ? ` (intent ${selectedKeyword.intent})` : ''}. Kamu tetap bisa mengubahnya.
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
                      className={`rounded-2xl border p-4 text-left transition-all duration-150 active:scale-[0.99] disabled:opacity-50 ${
                        isSelected
                          ? 'border-[#111111] bg-gray-50 ring-1 ring-[#111111]'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-medium text-[#111111]">
                          {type.label}
                          {isSuggested && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                              Disarankan
                            </span>
                          )}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isSelected ? 'bg-[#111111] text-white' : 'bg-gray-100 text-[#6B7280]'
                          }`}
                        >
                          {type.wordTarget}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6B7280]">{type.description}</p>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Pipeline progress */}
            {generating && (
              <Card title="Progress Pipeline">
                <ol>
                  {STEP_LABELS.map((label, i) => {
                    const status = steps[i]
                    return (
                      <li key={label} className="flex gap-3 pb-4 last:pb-0">
                        <span className="mt-0.5 shrink-0">
                          <StepIcon status={status} />
                        </span>
                        <div className="pt-0.5">
                          <p
                            className={`text-sm font-medium ${
                              status === 'pending' ? 'text-[#6B7280]' : 'text-[#111111]'
                            }`}
                          >
                            {label}
                          </p>
                          <p
                            className={`text-xs ${
                              status === 'error' ? 'text-red-500' : 'text-[#6B7280]'
                            }`}
                          >
                            {statusText(status)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </Card>
            )}

            {/* Error */}
            {error && (
              <Card>
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">Gagal generate artikel</span>
                </div>
                <p className="mt-2 text-sm text-[#6B7280]">{error}</p>
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
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[#6B7280]">
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

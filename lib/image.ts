// Multi-word Indonesian tech phrases -> English concept, checked before the
// single-word map so "hemat baterai" becomes "battery saving" and not
// "battery" + a leftover "hemat".
const PHRASE_MAP: [string, string][] = [
  ['kecerdasan buatan', 'artificial intelligence'],
  ['media sosial', 'social media'],
  ['dompet digital', 'digital wallet'],
  ['kata sandi', 'password'],
  ['kartu memori', 'memory card'],
  ['ruang penyimpanan', 'storage space'],
  ['hemat baterai', 'battery saving'],
  ['menghemat baterai', 'battery saving'],
  ['hemat kuota', 'data saving'],
  ['jaringan internet', 'internet connection'],
  ['koneksi internet', 'internet connection'],
  ['sinyal wifi', 'wifi signal'],
  ['kamera hp', 'smartphone camera'],
  ['hp android', 'android phone'],
  ['hp lemot', 'slow phone'],
  ['memori penuh', 'storage full']
]

// Single-word Indonesian -> English tech vocabulary. Words not found here
// pass through unchanged (many keywords already contain English terms or
// brand names like "iPhone", "WhatsApp"). "laptop" maps to a broader
// "laptop computer" pair for a more specific/reliable Unsplash match.
const WORD_MAP: Record<string, string> = {
  smartphone: 'smartphone',
  handphone: 'smartphone',
  ponsel: 'smartphone',
  hp: 'smartphone',
  baterai: 'battery',
  hemat: 'saving',
  menghemat: 'saving',
  internet: 'internet',
  wifi: 'wifi',
  laptop: 'laptop computer',
  komputer: 'computer',
  aplikasi: 'app',
  kamera: 'camera',
  foto: 'photo',
  video: 'video',
  layar: 'screen',
  memori: 'memory',
  penyimpanan: 'storage',
  koneksi: 'connection',
  jaringan: 'network',
  keamanan: 'security',
  sandi: 'password',
  akun: 'account',
  data: 'data',
  cloud: 'cloud',
  backup: 'backup',
  murah: 'budget',
  mahal: 'expensive',
  terbaik: 'best',
  tercepat: 'fastest',
  gaming: 'gaming',
  game: 'gaming',
  charger: 'charger',
  casan: 'charger',
  headset: 'headset',
  earphone: 'earphone',
  bluetooth: 'bluetooth',
  spesifikasi: 'specifications',
  review: 'review',
  perbandingan: 'comparison',
  rekomendasi: 'recommendation'
}

// Instructional/filler words that carry no visual meaning for an image search.
// "harga" (price) and "core" (as in "core i5") are dropped rather than
// translated — neither points to something a photo can represent.
const STOPWORDS = new Set([
  'cara', 'tips', 'trik', 'panduan', 'tutorial', 'langkah', 'agar', 'supaya',
  'biar', 'untuk', 'dengan', 'di', 'ke', 'dari', 'yang', 'adalah', 'itu',
  'ini', 'apa', 'kenapa', 'mengapa', 'bagaimana', 'lengkap', 'mudah',
  'sederhana', 'simple', 'dan', 'atau', 'juga', 'saja', 'paling', 'sangat',
  'bisa', 'dapat', 'tanpa', 'yuk', 'nih', 'dong', 'sih', 'harga', 'core'
])

// Translate an Indonesian keyword into a short English image-search query by
// concept (not word-for-word): strip filler words, swap known phrases/words
// for their English equivalent, and keep unknown tokens (brand names,
// already-English terms) as-is.
function translateToQuery(keyword: string): string {
  let text = keyword.toLowerCase().trim()

  for (const [id, en] of PHRASE_MAP) {
    text = text.replace(new RegExp(`\\b${id}\\b`, 'g'), en)
  }

  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w))
    .map((w) => WORD_MAP[w] ?? w)

  const unique = Array.from(new Set(words)).slice(0, 5)
  return unique.length > 0 ? unique.join(' ') : 'technology'
}

// Query the official Unsplash Search API. Returns null (never throws) on a
// missing key, request failure, or no results, so the caller always has a
// Pollinations fallback to reach for.
async function searchUnsplash(query: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY
  if (!accessKey) return null

  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
        signal: AbortSignal.timeout(5000)
      }
    )
    if (!response.ok) return null

    const data = (await response.json()) as {
      results?: Array<{ urls?: { regular?: string } }>
    }
    return data.results?.[0]?.urls?.regular ?? null
  } catch {
    return null
  }
}

export async function getFeaturedImage(
  keyword: string,
  title: string
): Promise<{ url: string; alt: string }> {
  const searchTerm = translateToQuery(keyword)
  const query = encodeURIComponent(searchTerm)

  const imageUrl = await searchUnsplash(query)
  const fallbackUrl = `https://image.pollinations.ai/prompt/${query}%20technology%20blog?width=1200&height=630&nologo=true`

  return { url: imageUrl ?? fallbackUrl, alt: title }
}

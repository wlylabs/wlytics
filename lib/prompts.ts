import type { ArticleTypeConfig } from '@/lib/articleTypes'

// Inject the live date so the model writes for the current year instead of
// defaulting to its training-era year (e.g. 2024).
function today() {
  const now = new Date()
  const year = now.getFullYear()
  const tanggal = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  return { year, nextYear: year + 1, tanggal }
}

export const PROMPTS = {
  keyword_research: () => {
    const { year, nextYear } = today()
    return `
Kamu adalah SEO specialist teknologi Indonesia.
Berikan 20 keyword long-tail bahasa Indonesia niche teknologi.
Kriteria:
- Search intent: informational & commercial
- Kesulitan: rendah-menengah untuk blog baru
- Relevan untuk tahun ${year}-${nextYear} (JANGAN pakai tahun yang sudah lewat)
- Topik: smartphone, laptop, AI tools, aplikasi, tips teknologi

Output HANYA JSON array tanpa teks lain:
[
  {
    "keyword": "...",
    "intent": "informational",
    "estimasi_artikel": "judul artikel yang cocok"
  }
]`
  },

  generate_outline: (keyword: string, type: ArticleTypeConfig) => {
    const { year } = today()
    return `
Kamu adalah SEO content strategist teknologi Indonesia.
Tahun sekarang: ${year}. Buat outline yang relevan dengan kondisi terkini ${year}.
Jenis artikel: ${type.label} — ${type.description}.
Buat outline artikel untuk keyword: "${keyword}"

Aturan:
- 1 H1 mengandung keyword, max 65 karakter
- Struktur: ${type.outline}
- ${type.extras}
- Jika menyebut tahun, gunakan ${year} (bukan tahun lampau)

Output dalam format markdown.`
  },

  generate_article: (keyword: string, outline: string, type: ArticleTypeConfig) => {
    const { year, tanggal } = today()
    return `
Kamu adalah penulis artikel teknologi profesional Indonesia.
Tanggal hari ini: ${tanggal}. Tulis seolah-olah ditulis pada tahun ${year}.
Jenis artikel: ${type.label} — ${type.description}.

KEYWORD UTAMA: ${keyword}
OUTLINE:
${outline}

ATURAN:
1. Bahasa Indonesia natural, tidak kaku
2. Keyword di 100 kata pertama, minimal 3x di body, 1x kesimpulan
3. Max 4 kalimat per paragraf
4. Analogi sederhana untuk hal teknis
5. Sisipkan [AFFILIATE_1] [AFFILIATE_2] [CTA_BOX] sesuai outline
6. H2 pakai ##, H3 pakai ###
7. Bold untuk istilah penting
8. Jika menyebut tahun, gunakan ${year} sebagai tahun terkini. JANGAN menyebut
   tahun yang sudah lewat (mis. 2023/2024) seolah-olah masa kini.

TONE: Informatif, friendly
PANJANG: ${type.panjang}
HINDARI: kata "kami", "artikel ini akan", pembuka klise

Tulis artikel sekarang:`
  },

  generate_meta: (keyword: string, summary: string) => {
    const { year } = today()
    return `
Berdasarkan artikel tentang "${keyword}":
${summary}

Tahun sekarang ${year}. Jika meta menyebut tahun, gunakan ${year}.

Output HANYA JSON tanpa teks lain:
{
  "meta_title": "max 60 karakter mengandung keyword",
  "meta_description": "max 155 karakter ada soft CTA",
  "slug": "url-friendly-pakai-tanda-hubung",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "kategori": "Smartphone atau Laptop atau AI atau Aplikasi atau Tips"
}`
  }
}

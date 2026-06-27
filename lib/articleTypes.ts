export type ArticleTypeId = 'panduan' | 'tips' | 'perbandingan' | 'berita'

export interface ArticleTypeConfig {
  id: ArticleTypeId
  label: string
  description: string
  /** Short display target, e.g. "2000+ kata" */
  wordTarget: string
  /** Length instruction handed to the model */
  panjang: string
  /** Outline structure guidance */
  outline: string
  /** Extra markers / structural notes (affiliate boxes, tables, etc.) */
  extras: string
}

export const ARTICLE_TYPES: ArticleTypeConfig[] = [
  {
    id: 'panduan',
    label: 'Panduan Lengkap',
    description: 'Tutorial mendalam langkah demi langkah',
    wordTarget: '2000+ kata',
    panjang: 'minimal 2000 kata (boleh lebih jika perlu)',
    outline:
      '5-7 H2 sebagai section/langkah utama, tiap H2 punya 2-3 H3, dan bagian FAQ 5 pertanyaan di akhir',
    extras:
      'Tandai [AFFILIATE_1] di H2 ke-2, [AFFILIATE_2] di H2 ke-4, [CTA_BOX] sebelum kesimpulan'
  },
  {
    id: 'tips',
    label: 'Tips & Trik',
    description: 'Kumpulan tips praktis yang actionable',
    wordTarget: '1200-1500 kata',
    panjang: '1200-1500 kata',
    outline:
      '4-6 H2 (boleh berupa daftar tips bernomor), tiap H2 punya 1-2 H3, dan FAQ 3 pertanyaan di akhir',
    extras: 'Tandai [AFFILIATE_1] di tengah artikel dan [CTA_BOX] sebelum kesimpulan'
  },
  {
    id: 'perbandingan',
    label: 'Perbandingan',
    description: 'Membandingkan beberapa produk atau opsi',
    wordTarget: '1500-2000 kata',
    panjang: '1500-2000 kata',
    outline:
      '4-6 H2 (overview tiap opsi, tabel perbandingan, kelebihan & kekurangan, lalu rekomendasi), tiap H2 punya 1-3 H3, dan FAQ 3 pertanyaan',
    extras:
      'Sertakan tabel perbandingan markdown, tandai [AFFILIATE_1] dan [AFFILIATE_2] pada opsi yang direkomendasikan, dan [CTA_BOX] sebelum verdict'
  },
  {
    id: 'berita',
    label: 'Berita Teknologi',
    description: 'Berita ringkas dan to the point',
    wordTarget: '800-1000 kata',
    panjang: '800-1000 kata',
    outline:
      '3-4 H2 (apa yang terjadi, detail penting, dampak/analisis), H3 seperlunya, tanpa bagian FAQ',
    extras: 'Gaya jurnalistik ringkas, tanpa affiliate box, boleh satu [CTA_BOX] di akhir'
  }
]

export const DEFAULT_ARTICLE_TYPE: ArticleTypeId = 'panduan'

export function getArticleType(id?: string): ArticleTypeConfig {
  return ARTICLE_TYPES.find((t) => t.id === id) ?? ARTICLE_TYPES[0]
}

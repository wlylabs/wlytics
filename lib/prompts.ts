export const PROMPTS = {
  keyword_research: `
Kamu adalah SEO specialist teknologi Indonesia.
Berikan 20 keyword long-tail bahasa Indonesia niche teknologi.
Kriteria:
- Search intent: informational & commercial
- Kesulitan: rendah-menengah untuk blog baru
- Relevan 2025-2026
- Topik: smartphone, laptop, AI tools, aplikasi, tips teknologi

Output HANYA JSON array tanpa teks lain:
[
  {
    "keyword": "...",
    "intent": "informational",
    "estimasi_artikel": "judul artikel yang cocok"
  }
]`,

  generate_outline: (keyword: string) => `
Kamu adalah SEO content strategist teknologi Indonesia.
Buat outline artikel untuk keyword: "${keyword}"

Aturan:
- 1 H1 mengandung keyword, max 65 karakter
- 4-6 H2 sebagai section utama
- Setiap H2 punya 2-3 H3
- Bagian FAQ 5 pertanyaan di akhir
- Tandai [AFFILIATE_1] di H2 ke-2
- Tandai [AFFILIATE_2] di H2 ke-4
- Tandai [CTA_BOX] sebelum kesimpulan

Output dalam format markdown.`,

  generate_article: (keyword: string, outline: string) => `
Kamu adalah penulis artikel teknologi profesional Indonesia.

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

TONE: Informatif, friendly
PANJANG: 1800-2200 kata
HINDARI: kata "kami", "artikel ini akan", pembuka klise

Tulis artikel sekarang:`,

  generate_meta: (keyword: string, summary: string) => `
Berdasarkan artikel tentang "${keyword}":
${summary}

Output HANYA JSON tanpa teks lain:
{
  "meta_title": "max 60 karakter mengandung keyword",
  "meta_description": "max 155 karakter ada soft CTA",
  "slug": "url-friendly-pakai-tanda-hubung",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "kategori": "Smartphone atau Laptop atau AI atau Aplikasi atau Tips"
}`
}

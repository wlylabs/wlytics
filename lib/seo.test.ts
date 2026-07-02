import { describe, it, expect } from 'vitest'
import { scoreArticle } from './seo'

function repeat(word: string, n: number): string {
  return Array(n).fill(word).join(' ')
}

// Builds a description whose length lands in [min, max] by appending whole
// words from a fixed pool until the threshold is crossed.
function buildDescription(min: number, max: number): string {
  const pool = [
    'Laptop', 'gaming', 'terbaik', 'untuk', 'kamu', 'yang', 'mencari', 'performa',
    'tinggi', 'dengan', 'harga', 'terjangkau', 'dan', 'desain', 'elegan', 'kebutuhan',
    'harian', 'serta', 'tahan', 'lama', 'dipakai', 'bermain', 'maupun', 'bekerja'
  ]
  let desc = ''
  let i = 0
  while (desc.length < min) {
    desc += (desc ? ' ' : '') + pool[i % pool.length]
    i++
  }
  expect(desc.length).toBeLessThanOrEqual(max)
  return desc
}

function buildGoodArticle() {
  const keyword = 'laptop gaming'
  const intro = `Laptop gaming adalah pilihan tepat untuk gamer masa kini. ${repeat('kata', 90)}`
  const section2 = `## Kelebihan Laptop Gaming\n\n${repeat('kata', 150)} laptop gaming ${repeat('kata', 50)}`
  const section3 = `## Kekurangan Laptop Gaming\n\n${repeat('kata', 150)} laptop gaming ${repeat('kata', 50)}`
  const section4 = `## Kesimpulan\n\n${repeat('kata', 150)} [baca juga](https://example.com/laptop-gaming)`
  const content = [intro, section2, section3, section4].join('\n\n')

  return {
    content,
    keyword,
    meta_title: 'Review Laptop Gaming Terbaik 2026',
    meta_description: buildDescription(120, 155)
  }
}

describe('scoreArticle', () => {
  it('passes the core checks for a well-formed article', () => {
    const report = scoreArticle(buildGoodArticle())
    const byLabel = Object.fromEntries(report.checks.map((c) => [c.label, c.pass]))

    expect(byLabel['Keyword di meta title']).toBe(true)
    expect(byLabel['Meta title ≤ 60 karakter']).toBe(true)
    expect(byLabel['Meta description 120–155 karakter']).toBe(true)
    expect(byLabel['Keyword di 100 kata pertama']).toBe(true)
    expect(byLabel['Panjang konten cukup (≥ 600 kata)']).toBe(true)
    expect(byLabel['Minimal 3 subjudul (H2)']).toBe(true)
    expect(byLabel['Minimal 1 tautan']).toBe(true)
    expect(report.score).toBeGreaterThan(80)
  })

  it('fails length and structure checks for a short, bare article', () => {
    const report = scoreArticle({
      content: 'Artikel pendek tanpa struktur apa pun.',
      keyword: 'laptop gaming',
      meta_title: '',
      meta_description: ''
    })
    const byLabel = Object.fromEntries(report.checks.map((c) => [c.label, c.pass]))

    expect(byLabel['Keyword di meta title']).toBe(false)
    expect(byLabel['Meta title ≤ 60 karakter']).toBe(false)
    expect(byLabel['Meta description 120–155 karakter']).toBe(false)
    expect(byLabel['Panjang konten cukup (≥ 600 kata)']).toBe(false)
    expect(byLabel['Minimal 3 subjudul (H2)']).toBe(false)
    expect(byLabel['Minimal 1 tautan']).toBe(false)
    expect(report.score).toBeLessThan(30)
  })

  it('returns a score between 0 and 100', () => {
    const report = scoreArticle(buildGoodArticle())
    expect(report.score).toBeGreaterThanOrEqual(0)
    expect(report.score).toBeLessThanOrEqual(100)
  })
})

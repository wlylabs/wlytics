import { describe, it, expect } from 'vitest'
import { getArticleType, suggestArticleType, ARTICLE_TYPES, DEFAULT_ARTICLE_TYPE } from './articleTypes'

describe('getArticleType', () => {
  it('returns the matching type by id', () => {
    expect(getArticleType('tips').id).toBe('tips')
  })

  it('falls back to the default type for an unknown id', () => {
    expect(getArticleType('unknown').id).toBe(DEFAULT_ARTICLE_TYPE)
  })

  it('falls back to the default type when id is undefined', () => {
    expect(getArticleType(undefined).id).toBe(DEFAULT_ARTICLE_TYPE)
  })

  it('covers every declared article type', () => {
    for (const type of ARTICLE_TYPES) {
      expect(getArticleType(type.id).id).toBe(type.id)
    }
  })
})

describe('suggestArticleType', () => {
  it('detects news keywords', () => {
    expect(suggestArticleType('HP terbaru resmi diluncurkan')).toBe('berita')
  })

  it('detects comparison keywords', () => {
    expect(suggestArticleType('laptop A vs laptop B')).toBe('perbandingan')
  })

  it('detects tips keywords', () => {
    expect(suggestArticleType('tips hemat baterai HP')).toBe('tips')
  })

  it('detects guide keywords', () => {
    expect(suggestArticleType('cara setting router wifi')).toBe('panduan')
  })

  it('falls back to perbandingan for commercial intent with no other signal', () => {
    expect(suggestArticleType('review headset gaming murah', 'commercial')).toBe('perbandingan')
  })

  it('falls back to panduan when no signal or intent matches', () => {
    expect(suggestArticleType('teknologi 5G masa depan')).toBe('panduan')
  })
})

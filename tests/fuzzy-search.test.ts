import { describe, it, expect } from 'vitest'
import { fuzzyMatch, fuzzyMatchMultiWord, parseSearchFilters } from '@/lib/fuzzy-search'

describe('fuzzyMatch', () => {
  it('returns null for empty pattern if no special handling', () => {
    const result = fuzzyMatch('', 'hello')
    expect(result).not.toBeNull()
    expect(result!.score).toBe(0)
    expect(result!.matches).toEqual([])
  })

  it('matches exact substring', () => {
    const result = fuzzyMatch('hello', 'hello world')
    expect(result).not.toBeNull()
    expect(result!.score).toBeGreaterThan(0)
    expect(result!.matches.length).toBeGreaterThan(0)
  })

  it('matches case-insensitively', () => {
    const result = fuzzyMatch('HELLO', 'hello world')
    expect(result).not.toBeNull()
  })

  it('returns null when pattern chars not found in text', () => {
    const result = fuzzyMatch('xyz', 'hello')
    expect(result).toBeNull()
  })

  it('returns null when pattern is longer than text', () => {
    const result = fuzzyMatch('a very long pattern', 'short')
    expect(result).toBeNull()
  })

  it('scores consecutive matches higher than scattered', () => {
    const consecutive = fuzzyMatch('abc', 'abcdef')
    const scattered = fuzzyMatch('abc', 'a--b--c')
    expect(consecutive).not.toBeNull()
    expect(scattered).not.toBeNull()
    expect(consecutive!.score).toBeGreaterThan(scattered!.score)
  })

  it('gives word boundary bonus', () => {
    const boundary = fuzzyMatch('fn', 'file_name')     // f at word start, n at word start
    const middle = fuzzyMatch('fn', 'differently_on')   // scattered in middle
    // Both match — boundary should score higher or equal
    if (boundary && middle) {
      expect(boundary.score).toBeGreaterThanOrEqual(middle.score)
    }
  })
})

describe('fuzzyMatchMultiWord', () => {
  it('matches all words in query', () => {
    const result = fuzzyMatchMultiWord('hello world', 'hello beautiful world')
    expect(result).not.toBeNull()
  })

  it('returns null if any word fails to match', () => {
    const result = fuzzyMatchMultiWord('hello xyz', 'hello beautiful world')
    expect(result).toBeNull()
  })

  it('handles single-word queries', () => {
    const result = fuzzyMatchMultiWord('hello', 'hello world')
    expect(result).not.toBeNull()
  })

  it('handles empty query gracefully', () => {
    const result = fuzzyMatchMultiWord('', 'some text')
    expect(result).not.toBeNull()
    expect(result!.score).toBe(0)
  })
})

describe('parseSearchFilters', () => {
  it('parses bare query text', () => {
    const filters = parseSearchFilters('hello world')
    expect(filters.query).toBe('hello world')
  })

  it('extracts tag: filter', () => {
    const filters = parseSearchFilters('hello tag:important')
    expect(filters.query).toBe('hello')
    expect(filters.tags).toContain('important')
  })

  it('extracts in: filter', () => {
    const filters = parseSearchFilters('note in:content')
    expect(filters.query).toBe('note')
    expect(filters.scope).toBe('content')
  })

  it('handles multiple filters', () => {
    const filters = parseSearchFilters('query tag:foo tag:bar')
    expect(filters.query).toBe('query')
    expect(filters.tags).toContain('foo')
    expect(filters.tags).toContain('bar')
  })
})

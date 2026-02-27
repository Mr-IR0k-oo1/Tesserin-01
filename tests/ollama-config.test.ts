import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getOllamaEndpoint, getOllamaModel, OLLAMA_DEFAULT_ENDPOINT, OLLAMA_DEFAULT_MODEL } from '@/lib/ollama-config'

describe('ollama-config', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getOllamaEndpoint', () => {
    it('returns default endpoint when no settings stored', () => {
      expect(getOllamaEndpoint()).toBe(OLLAMA_DEFAULT_ENDPOINT)
    })

    it('returns custom endpoint from settings', () => {
      const custom = 'http://192.168.1.100:11434'
      localStorage.setItem('tesserin:settings', JSON.stringify({
        'ai.ollamaEndpoint': custom,
      }))
      expect(getOllamaEndpoint()).toBe(custom)
    })

    it('returns default when settings has empty endpoint', () => {
      localStorage.setItem('tesserin:settings', JSON.stringify({
        'ai.ollamaEndpoint': '',
      }))
      expect(getOllamaEndpoint()).toBe(OLLAMA_DEFAULT_ENDPOINT)
    })

    it('returns default when settings JSON is corrupted', () => {
      localStorage.setItem('tesserin:settings', 'not valid json{{{')
      expect(getOllamaEndpoint()).toBe(OLLAMA_DEFAULT_ENDPOINT)
    })
  })

  describe('getOllamaModel', () => {
    it('returns default model when no settings stored', () => {
      expect(getOllamaModel()).toBe(OLLAMA_DEFAULT_MODEL)
    })

    it('returns custom model from settings', () => {
      localStorage.setItem('tesserin:settings', JSON.stringify({
        'ai.defaultModel': 'mistral',
      }))
      expect(getOllamaModel()).toBe('mistral')
    })
  })
})

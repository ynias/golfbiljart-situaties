import { describe, expect, it } from 'vitest'
import { getLikerId, isValidLikerId } from './liker'

function memoryStorage() {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) }
}

describe('getLikerId', () => {
  it('creates a uuid once and reuses it', () => {
    const storage = memoryStorage()
    const first = getLikerId(storage)
    expect(isValidLikerId(first)).toBe(true)
    expect(getLikerId(storage)).toBe(first)
  })

  it('replaces a corrupt stored value', () => {
    const storage = memoryStorage()
    storage.setItem('liker_id', 'not-a-uuid')
    expect(isValidLikerId(getLikerId(storage))).toBe(true)
  })

  it('still returns an id when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(isValidLikerId(getLikerId(broken))).toBe(true)
  })
})

/** Anonymous device id used for likes: a random uuid kept in localStorage. */

const STORAGE_KEY = 'liker_id'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

let fallback: string | null = null

export function isValidLikerId(id: unknown): id is string {
  return typeof id === 'string' && UUID.test(id)
}

export function getLikerId(storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()): string {
  try {
    const stored = storage?.getItem(STORAGE_KEY)
    if (isValidLikerId(stored)) return stored
    const id = crypto.randomUUID()
    storage?.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // Storage unavailable (private mode): likes then only count for this page view.
    fallback ??= crypto.randomUUID()
    return fallback
  }
}

function safeStorage(): Storage | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

import { ref } from 'vue'

const STORAGE_KEY = 'situation_edit_tokens'

type TokenMap = Record<string, string>

function read(): TokenMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : {}
    return parsed && typeof parsed === 'object' ? (parsed as TokenMap) : {}
  } catch {
    return {}
  }
}

function write(map: TokenMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* storage may be unavailable (private mode); editing then only works in this session */
  }
}

const tokens = ref<TokenMap>(read())

/** Edit tokens of situations created on this device, keyed by slug, kept in localStorage. */
export function useEditTokens() {
  function get(slug: string): string | null {
    return tokens.value[slug] ?? null
  }

  function set(slug: string, token: string): void {
    tokens.value = { ...tokens.value, [slug]: token }
    write(tokens.value)
  }

  function remove(slug: string): void {
    const next = { ...tokens.value }
    delete next[slug]
    tokens.value = next
    write(next)
  }

  function slugs(): string[] {
    return Object.keys(tokens.value)
  }

  return { tokens, get, set, remove, slugs }
}

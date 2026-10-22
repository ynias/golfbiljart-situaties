/** Anonymous likes (one per device, see liker.ts). */
import { getLikerId } from './liker'
import { supabase } from './supabase'

/** Likes or unlikes a situation for this device; returns the new state and total. */
export async function toggleLike(slug: string): Promise<{ liked: boolean; likeCount: number }> {
  const { data, error } = await supabase.rpc('toggle_like', { p_slug: slug, p_liker: getLikerId() })
  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('toggle_like returned no row')
  return { liked: row.liked, likeCount: row.like_count }
}

/** Slugs (out of the given ones) that this device has liked. */
export async function likedSlugs(slugs: string[]): Promise<Set<string>> {
  if (slugs.length === 0) return new Set()
  const { data, error } = await supabase.rpc('liked_slugs', { p_liker: getLikerId(), p_slugs: slugs })
  if (error) throw error
  return new Set(data ?? [])
}

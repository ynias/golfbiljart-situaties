/** Data access for situations (Supabase). All functions throw on unexpected errors. */
import type { Situation, SituationData } from '../domain/types'
import type { Tables } from './database.types'
import { generateEditToken, generateSlug } from './slug'
import { supabase } from './supabase'

export interface SituationInput {
  title: string
  description?: string
  authorName?: string
  data: SituationData
}

type Row = Tables<'situations_public'>

function toSituation(row: Row): Situation {
  return {
    slug: row.slug ?? '',
    title: row.title ?? '',
    description: row.description ?? undefined,
    authorName: row.author_name ?? undefined,
    isPublic: row.is_public ?? true,
    data: row.data as unknown as SituationData,
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

const clean = (s?: string) => {
  const t = s?.trim()
  return t ? t : null
}

/** Creates a situation; returns its slug and the secret edit token (store it on the device). */
export async function createSituation(input: SituationInput): Promise<{ slug: string; editToken: string }> {
  const editToken = generateEditToken()
  // Retry on the (very unlikely) slug collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug()
    const { error } = await supabase.from('situations').insert({
      slug,
      title: input.title.trim(),
      description: clean(input.description),
      author_name: clean(input.authorName),
      is_public: true,
      data: input.data as never,
      edit_token: editToken,
    })
    if (!error) return { slug, editToken }
    if (error.code !== '23505') throw error
  }
  throw new Error('could not generate a unique slug')
}

export async function getSituation(slug: string): Promise<Situation | null> {
  const { data, error } = await supabase.from('situations_public').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? toSituation(data) : null
}

export async function listSituations(options: { search?: string; limit?: number } = {}): Promise<Situation[]> {
  let query = supabase
    .from('situations_public')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 30)
  const search = options.search?.trim()
  if (search) query = query.ilike('title', `%${search.replace(/[%_]/g, '')}%`)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(toSituation)
}

export async function listSituationsBySlugs(slugs: string[]): Promise<Situation[]> {
  if (slugs.length === 0) return []
  const { data, error } = await supabase
    .from('situations_public')
    .select('*')
    .in('slug', slugs)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(toSituation)
}

/** Updates a situation with its edit token. Returns false when slug/token do not match. */
export async function updateSituation(slug: string, editToken: string, input: SituationInput): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_situation', {
    p_slug: slug,
    p_token: editToken,
    p_title: input.title.trim(),
    p_description: clean(input.description) as string,
    p_author_name: clean(input.authorName) as string,
    p_data: input.data as never,
  })
  if (error) throw error
  return data === true
}

/** Deletes a situation with its edit token. Returns false when slug/token do not match. */
export async function deleteSituation(slug: string, editToken: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_situation', { p_slug: slug, p_token: editToken })
  if (error) throw error
  return data === true
}

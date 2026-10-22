/** Comments (feedback) on situations. */
import type { CommentInput } from '../domain/comment'
import type { SituationComment } from '../domain/types'
import type { Tables } from './database.types'
import { supabase } from './supabase'

type Row = Tables<'situation_comments'>

function toComment(row: Row): SituationComment {
  return {
    id: row.id,
    situationId: row.situation_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  }
}

export async function listComments(situationId: string): Promise<SituationComment[]> {
  const { data, error } = await supabase
    .from('situation_comments')
    .select('*')
    .eq('situation_id', situationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map(toComment)
}

export async function addComment(slug: string, input: CommentInput): Promise<SituationComment> {
  const { data, error } = await supabase.rpc('add_comment', {
    p_slug: slug,
    p_author_name: input.authorName.trim(),
    p_body: input.body.trim(),
  })
  if (error) throw error
  return toComment(data)
}

export interface RecentComment extends SituationComment {
  situationSlug: string
  situationTitle: string
}

/** Admin overview: newest comments across all situations. */
export async function listRecentComments(limit = 50): Promise<RecentComment[]> {
  const { data, error } = await supabase
    .from('situation_comments')
    .select('*, situations(slug, title)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...toComment(row),
    situationSlug: row.situations?.slug ?? '',
    situationTitle: row.situations?.title ?? '',
  }))
}

/** Admin: deletes a comment. */
export async function adminDeleteComment(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('admin_delete_comment', { p_id: id })
  if (error) throw error
  return data === true
}

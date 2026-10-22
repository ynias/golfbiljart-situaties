/** Rules for comments on a situation. Pure functions, no UI. */

export const MAX_COMMENT_AUTHOR_LENGTH = 60
export const MAX_COMMENT_LENGTH = 1000

export interface CommentInput {
  authorName: string
  body: string
}

export interface CommentErrors {
  authorName?: string
  body?: string
}

/** Validates a comment before it is sent; mirrors the checks in the database. */
export function validateComment(input: CommentInput): CommentErrors {
  const errors: CommentErrors = {}
  const name = input.authorName.trim()
  const body = input.body.trim()
  if (!name) errors.authorName = 'Vul je naam in.'
  else if (name.length > MAX_COMMENT_AUTHOR_LENGTH) errors.authorName = `Je naam mag maximaal ${MAX_COMMENT_AUTHOR_LENGTH} tekens zijn.`
  if (!body) errors.body = 'Schrijf je feedback.'
  else if (body.length > MAX_COMMENT_LENGTH) errors.body = `Je feedback mag maximaal ${MAX_COMMENT_LENGTH} tekens zijn.`
  return errors
}

export const hasErrors = (errors: CommentErrors) => Object.keys(errors).length > 0

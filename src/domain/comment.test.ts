import { describe, expect, it } from 'vitest'
import { MAX_COMMENT_AUTHOR_LENGTH, MAX_COMMENT_LENGTH, hasErrors, validateComment } from './comment'

describe('validateComment', () => {
  it('accepts a name and feedback', () => {
    const errors = validateComment({ authorName: 'Jan', body: 'Ik zou via de band spelen.' })
    expect(errors).toEqual({})
    expect(hasErrors(errors)).toBe(false)
  })

  it('requires a name and feedback, ignoring surrounding whitespace', () => {
    const errors = validateComment({ authorName: '   ', body: '\n ' })
    expect(errors.authorName).toBeDefined()
    expect(errors.body).toBeDefined()
    expect(hasErrors(errors)).toBe(true)
  })

  it('enforces the maximum lengths', () => {
    expect(validateComment({ authorName: 'x'.repeat(MAX_COMMENT_AUTHOR_LENGTH), body: 'ok' })).toEqual({})
    expect(validateComment({ authorName: 'x'.repeat(MAX_COMMENT_AUTHOR_LENGTH + 1), body: 'ok' }).authorName).toBeDefined()
    expect(validateComment({ authorName: 'Jan', body: 'x'.repeat(MAX_COMMENT_LENGTH) })).toEqual({})
    expect(validateComment({ authorName: 'Jan', body: 'x'.repeat(MAX_COMMENT_LENGTH + 1) }).body).toBeDefined()
  })
})

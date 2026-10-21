import { customAlphabet } from 'nanoid'

/** Lowercase letters and digits without the confusable 0/o, 1/l/i. */
const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export const SLUG_LENGTH = 8

export const generateSlug = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH)

/** Secret per situation, kept in the creator's browser. */
export const generateEditToken = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 32)

export function isValidSlug(slug: string): boolean {
  return new RegExp(`^[${SLUG_ALPHABET}]{${SLUG_LENGTH}}$`).test(slug)
}

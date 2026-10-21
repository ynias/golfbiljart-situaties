/** Colour themes for the table. Colours sampled from the reference images. */

export type ThemeName = 'teal' | 'green'

export interface TableTheme {
  cloth: string
  cushion: string
  rail: string
  line: string
  pin: string
  pinRing: string
  hole: string
}

export const themes: Record<ThemeName, TableTheme> = {
  /** docs/reference/tafel-2.png: blue-green cloth, black rail. Default. */
  teal: {
    cloth: '#0f615b',
    cushion: '#1a8078',
    rail: '#241d19',
    line: '#111111',
    pin: '#c8c8c8',
    pinRing: '#e01b1b',
    hole: '#0a0a0a',
  },
  /** docs/reference/tafel-1.png: bright green cloth, dark green cushion, maroon rail. */
  green: {
    cloth: '#00e400',
    cushion: '#008000',
    rail: '#800000',
    line: '#111111',
    pin: '#9a9a9a',
    pinRing: '#e01b1b',
    hole: '#0a0a0a',
  },
}

export const DEFAULT_THEME: ThemeName = 'teal'

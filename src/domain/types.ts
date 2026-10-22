export type BallColor = 'white' | 'red'

/** Position in mm, origin top-left of the playing surface, portrait orientation. */
export interface Point {
  x: number
  y: number
}

export type BallNumber = 1 | 2 | 3 | 4 | 5

export interface Ball {
  /** e.g. "W1", "R3" — stable within a situation. */
  id: string
  color: BallColor
  number: BallNumber
  position: Point
}

export interface Movement {
  /** 1 = played ball. */
  order: number
  ballId: string
  /** First point = start position, last = end position. */
  path: Point[]
  /** 'scored' → ball removed in the after-state. */
  result: 'rest' | 'scored'
}

export interface Shot {
  playedBallId: string
  movements: Movement[]
  note?: string
}

export interface SituationData {
  version: 1
  /** Reserved for future table variants. */
  table: 'standard'
  /** Preferred display orientation. */
  orientation?: 'portrait' | 'landscape'
  before: Ball[]
  shot: Shot
}

export interface Situation {
  id: string
  slug: string
  title: string
  description?: string
  authorName?: string
  isPublic: boolean
  data: SituationData
  createdAt: string
  updatedAt: string
  likeCount: number
  commentCount: number
}

export interface SituationComment {
  id: string
  situationId: string
  authorName: string
  body: string
  createdAt: string
}

export const MAX_BALLS_PER_COLOR = 5
export const MAX_TITLE_LENGTH = 120
export const MAX_DESCRIPTION_LENGTH = 500
export const MAX_AUTHOR_LENGTH = 60

/**
 * Rules for a situation: ball placement, numbering and validation of the before-state.
 * Pure functions, no UI.
 */
import { BALL_RADIUS, collidesWithPin, distance, isInsideTable } from '../table/geometry'
import { MAX_BALLS_PER_COLOR, type Ball, type BallColor, type BallNumber, type Point } from './types'

export const colorPrefix: Record<BallColor, string> = { white: 'W', red: 'R' }

export function ballId(color: BallColor, number: BallNumber): string {
  return `${colorPrefix[color]}${number}`
}

export function ballsOfColor(balls: readonly Ball[], color: BallColor): Ball[] {
  return balls.filter((b) => b.color === color)
}

/** Next free number for a colour, or null when the maximum is reached. */
export function nextBallNumber(balls: readonly Ball[], color: BallColor): BallNumber | null {
  const count = ballsOfColor(balls, color).length
  return count < MAX_BALLS_PER_COLOR ? ((count + 1) as BallNumber) : null
}

/**
 * True when a ball centred at `position` may lie there: fully on the playing surface, not on a
 * pin and not overlapping another ball (except the ball with `ignoreId`, i.e. the ball being moved).
 */
export function isValidBallPosition(position: Point, balls: readonly Ball[], ignoreId?: string): boolean {
  if (!isInsideTable(position, BALL_RADIUS)) return false
  if (collidesWithPin(position, BALL_RADIUS)) return false
  return balls.every((b) => b.id === ignoreId || distance(b.position, position) >= 2 * BALL_RADIUS)
}

/** Adds a ball with the next number of its colour. Returns the new list, or null when not allowed. */
export function addBall(balls: readonly Ball[], color: BallColor, position: Point): Ball[] | null {
  const number = nextBallNumber(balls, color)
  if (number === null) return null
  if (!isValidBallPosition(position, balls)) return null
  return [...balls, { id: ballId(color, number), color, number, position }]
}

/** Removes a ball and renumbers the remaining balls of that colour so numbering stays sequential. */
export function removeBall(balls: readonly Ball[], id: string): Ball[] {
  const removed = balls.find((b) => b.id === id)
  if (!removed) return [...balls]
  const rest = balls.filter((b) => b.id !== id)
  return renumber(rest)
}

/** Renumbers balls per colour in their current order (order of placement). */
export function renumber(balls: readonly Ball[]): Ball[] {
  const counters: Record<BallColor, number> = { white: 0, red: 0 }
  return balls.map((b) => {
    const number = (++counters[b.color]) as BallNumber
    return { ...b, number, id: ballId(b.color, number) }
  })
}

/** Moves a ball. Returns the new list, or null when the target position is not allowed. */
export function moveBall(balls: readonly Ball[], id: string, position: Point): Ball[] | null {
  if (!balls.some((b) => b.id === id)) return null
  if (!isValidBallPosition(position, balls, id)) return null
  return balls.map((b) => (b.id === id ? { ...b, position } : b))
}

/** Validates a before-state. Returns a list of problems (empty = valid). */
export function validateBefore(balls: readonly Ball[]): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const b of balls) {
    if (ids.has(b.id)) problems.push(`duplicate id ${b.id}`)
    ids.add(b.id)
    if (b.id !== ballId(b.color, b.number)) problems.push(`id ${b.id} does not match ${b.color} ${b.number}`)
    if (!isValidBallPosition(b.position, balls, b.id)) problems.push(`ball ${b.id} has an invalid position`)
  }
  for (const color of ['white', 'red'] as const) {
    const numbers = ballsOfColor(balls, color)
      .map((b) => b.number)
      .sort((a, b) => a - b)
    if (numbers.length > MAX_BALLS_PER_COLOR) problems.push(`more than ${MAX_BALLS_PER_COLOR} ${color} balls`)
    numbers.forEach((n, i) => {
      if (n !== i + 1) problems.push(`${color} numbering is not sequential`)
    })
  }
  return problems
}

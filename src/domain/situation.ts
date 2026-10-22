/**
 * Rules for a situation: ball placement, numbering and validation of the before-state.
 * Pure functions, no UI.
 */
import { BALL_RADIUS, collidesWithPin, distance, isInsideTable } from '../table/geometry'
import { MAX_BALLS_PER_COLOR, type Ball, type BallColor, type BallNumber, type Movement, type Point, type Shot } from './types'

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

// ---------------------------------------------------------------------------------------
// Shot and after-state
// ---------------------------------------------------------------------------------------

/** Next movement order: 1 when there are no movements yet. */
export function nextMovementOrder(movements: readonly Movement[]): number {
  return movements.length + 1
}

/** Movements sorted by order. */
export function sortedMovements(movements: readonly Movement[]): Movement[] {
  return [...movements].sort((a, b) => a.order - b.order)
}

/** Renumbers orders 1..n in the current sorted order. */
export function normalizeOrders(movements: readonly Movement[]): Movement[] {
  return sortedMovements(movements).map((m, i) => ({ ...m, order: i + 1 }))
}

/**
 * Moves the movement of `ballId` one step up or down in the order. The played ball (order 1)
 * always stays first. Returns the new list (unchanged when the move is not possible).
 */
export function reorderMovement(movements: readonly Movement[], ballId: string, direction: 'up' | 'down'): Movement[] {
  const list = normalizeOrders(movements)
  const i = list.findIndex((m) => m.ballId === ballId)
  if (i < 0) return list
  const j = direction === 'up' ? i - 1 : i + 1
  // index 0 is the played ball: it never moves and nothing moves above it
  if (i === 0 || j <= 0 || j >= list.length) return list
  const a = list[i]!
  const b = list[j]!
  list[i] = { ...b, order: i + 1 }
  list[j] = { ...a, order: j + 1 }
  return list
}

/**
 * After-state: every moved ball ends at the last point of its path, scored balls disappear,
 * untouched balls stay where they were.
 */
export function computeAfter(before: readonly Ball[], shot: Shot): Ball[] {
  const byBall = new Map(shot.movements.map((m) => [m.ballId, m]))
  const after: Ball[] = []
  for (const ball of before) {
    const m = byBall.get(ball.id)
    if (!m) {
      after.push({ ...ball, position: { ...ball.position } })
      continue
    }
    if (m.result === 'scored') continue
    const end = m.path[m.path.length - 1] ?? ball.position
    after.push({ ...ball, position: { ...end } })
  }
  return after
}

/** Validates a shot against its before-state. Returns a list of problems (empty = valid). */
export function validateShot(before: readonly Ball[], shot: Shot): string[] {
  const problems: string[] = []
  const balls = new Map(before.map((b) => [b.id, b]))
  if (!balls.has(shot.playedBallId)) problems.push(`played ball ${shot.playedBallId} does not exist`)
  const sorted = sortedMovements(shot.movements)
  if (sorted.length === 0) problems.push('no movements')
  sorted.forEach((m, i) => {
    if (m.order !== i + 1) problems.push(`orders are not sequential from 1 (got ${m.order} at ${i + 1})`)
    const ball = balls.get(m.ballId)
    if (!ball) {
      problems.push(`movement for unknown ball ${m.ballId}`)
      return
    }
    if (m.path.length < 2) problems.push(`movement of ${m.ballId} has no end point`)
    const start = m.path[0]
    if (!start || Math.abs(start.x - ball.position.x) > 1e-6 || Math.abs(start.y - ball.position.y) > 1e-6) {
      problems.push(`movement of ${m.ballId} does not start at the ball position`)
    }
    for (const p of m.path) {
      if (!isInsideTable(p, BALL_RADIUS) && !(m.result === 'scored' && p === m.path[m.path.length - 1])) {
        problems.push(`movement of ${m.ballId} leaves the table`)
        break
      }
    }
  })
  const first = sorted[0]
  if (first && first.ballId !== shot.playedBallId) problems.push('order 1 must belong to the played ball')
  const ids = sorted.map((m) => m.ballId)
  if (new Set(ids).size !== ids.length) problems.push('a ball has more than one movement')
  return problems
}

export interface SituationSummary {
  white: number
  red: number
  movements: number
  scored: number
}

/** Short summary for lists: balls per colour, number of movements and scored balls. */
export function summarize(before: readonly Ball[], shot: Shot): SituationSummary {
  return {
    white: ballsOfColor(before, 'white').length,
    red: ballsOfColor(before, 'red').length,
    movements: shot.movements.length,
    scored: shot.movements.filter((m) => m.result === 'scored').length,
  }
}

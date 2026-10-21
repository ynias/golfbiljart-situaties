/**
 * Pure helpers for movement paths (polylines in mm). No UI.
 */
import { BALL_RADIUS, HOLE_RADIUS, TABLE, distance, holes, type Hole } from '../table/geometry'
import type { Point } from './types'

/** Total length of a polyline. */
export function pathLength(path: readonly Point[]): number {
  let total = 0
  for (let i = 1; i < path.length; i++) total += distance(path[i - 1]!, path[i]!)
  return total
}

/** Position at `dist` mm along the polyline, clamped to its ends. */
export function positionAlongPath(path: readonly Point[], dist: number): Point {
  if (path.length === 0) throw new Error('empty path')
  if (path.length === 1 || dist <= 0) return { ...path[0]! }
  let remaining = dist
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!
    const b = path[i]!
    const seg = distance(a, b)
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    remaining -= seg
  }
  return { ...path[path.length - 1]! }
}

/** Clamps a ball centre so the whole ball lies on the playing surface. */
export function clampToTable(p: Point, ballRadius = BALL_RADIUS): Point {
  return {
    x: Math.min(Math.max(p.x, ballRadius), TABLE.width - ballRadius),
    y: Math.min(Math.max(p.y, ballRadius), TABLE.length - ballRadius),
  }
}

/**
 * Snaps a ball centre to the cushion when it is within `threshold` mm of the cushion line
 * (the line a ball centre follows when the ball touches the cushion). Used for cushion shots.
 * Points further away are returned unchanged (but clamped to the table).
 */
export function snapToCushion(p: Point, threshold = 40, ballRadius = BALL_RADIUS): Point {
  const c = clampToTable(p, ballRadius)
  const left = c.x - ballRadius
  const right = TABLE.width - ballRadius - c.x
  const top = c.y - ballRadius
  const bottom = TABLE.length - ballRadius - c.y
  const out = { ...c }
  if (left <= threshold && left <= right) out.x = ballRadius
  else if (right <= threshold) out.x = TABLE.width - ballRadius
  if (top <= threshold && top <= bottom) out.y = ballRadius
  else if (bottom <= threshold) out.y = TABLE.length - ballRadius
  return out
}

/** True when a ball centre at `p` touches the cushion line (after snapping). */
export function isOnCushion(p: Point, ballRadius = BALL_RADIUS, eps = 1e-6): boolean {
  return (
    Math.abs(p.x - ballRadius) < eps ||
    Math.abs(p.x - (TABLE.width - ballRadius)) < eps ||
    Math.abs(p.y - ballRadius) < eps ||
    Math.abs(p.y - (TABLE.length - ballRadius)) < eps
  )
}

/** The hole nearest to `p`. */
export function nearestHole(p: Point): Hole {
  return holes.reduce((best, h) => (distance(p, h.center) < distance(p, best.center) ? h : best), holes[0]!)
}

/**
 * True when a ball centred at `p` would drop into a hole: the centre lies within the hole
 * radius plus a tolerance (default: half a ball) of a hole centre.
 */
export function isScoringPoint(p: Point, tolerance = BALL_RADIUS): boolean {
  return distance(p, nearestHole(p).center) <= HOLE_RADIUS + tolerance
}

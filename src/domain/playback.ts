/**
 * Pure playback model for a shot: a timeline of sequential movements and the ball positions at
 * any time. No DOM, no timers; ShotPlayer.vue drives it with requestAnimationFrame.
 */
import { pathLength, positionAlongPath } from './paths'
import { sortedMovements } from './situation'
import type { Ball, Point, Shot } from './types'

export interface PlaybackOptions {
  /** Ball speed in mm per second at 1× playback. */
  speedMmPerSecond: number
  /** Minimum duration of a movement in ms, so very short paths remain visible. */
  minMovementMs: number
  /** Time at the end of a scored movement during which the ball shrinks into the hole. */
  scoreFadeMs: number
}

export const DEFAULT_PLAYBACK: PlaybackOptions = {
  speedMmPerSecond: 900,
  minMovementMs: 600,
  scoreFadeMs: 350,
}

export interface TimelineSegment {
  order: number
  ballId: string
  path: Point[]
  length: number
  result: 'rest' | 'scored'
  /** Start of the movement on the timeline, ms. */
  start: number
  /** Moment the ball reaches the end of its path, ms. */
  arrive: number
  /** End of the segment (after the score fade, if any), ms. */
  end: number
}

export interface Timeline {
  segments: TimelineSegment[]
  /** Total duration in ms. */
  total: number
}

export interface BallFrame {
  ball: Ball
  position: Point
  /** 1 = normal, shrinking to 0 while a scored ball drops into the hole. */
  scale: number
  visible: boolean
  /** True while this ball is moving at this moment. */
  moving: boolean
}

/** Builds the sequential timeline: movements play one after the other in order. */
export function buildTimeline(shot: Shot, options: PlaybackOptions = DEFAULT_PLAYBACK): Timeline {
  const segments: TimelineSegment[] = []
  let t = 0
  for (const m of sortedMovements(shot.movements)) {
    const length = pathLength(m.path)
    const travel = Math.max(options.minMovementMs, (length / options.speedMmPerSecond) * 1000)
    const fade = m.result === 'scored' ? options.scoreFadeMs : 0
    segments.push({
      order: m.order,
      ballId: m.ballId,
      path: m.path,
      length,
      result: m.result,
      start: t,
      arrive: t + travel,
      end: t + travel + fade,
    })
    t += travel + fade
  }
  return { segments, total: t }
}

/** Ball positions and visibility at time `t` (ms) on the timeline. */
export function frameAt(before: readonly Ball[], timeline: Timeline, t: number): BallFrame[] {
  const byBall = new Map(timeline.segments.map((s) => [s.ballId, s]))
  return before.map((ball) => {
    const seg = byBall.get(ball.id)
    if (!seg) return { ball, position: { ...ball.position }, scale: 1, visible: true, moving: false }
    if (t <= seg.start) return { ball, position: { ...seg.path[0] ?? ball.position }, scale: 1, visible: true, moving: false }
    if (t < seg.arrive) {
      const progress = (t - seg.start) / (seg.arrive - seg.start)
      return { ball, position: positionAlongPath(seg.path, seg.length * progress), scale: 1, visible: true, moving: true }
    }
    const end = seg.path[seg.path.length - 1] ?? ball.position
    if (seg.result !== 'scored') return { ball, position: { ...end }, scale: 1, visible: true, moving: false }
    if (t >= seg.end) return { ball, position: { ...end }, scale: 0, visible: false, moving: false }
    const fade = seg.end - seg.arrive
    const progress = fade === 0 ? 1 : (t - seg.arrive) / fade
    return { ball, position: { ...end }, scale: 1 - progress, visible: true, moving: true }
  })
}

/** Index of the segment that is playing at `t`, or -1 outside any segment. */
export function segmentIndexAt(timeline: Timeline, t: number): number {
  return timeline.segments.findIndex((s) => t >= s.start && t < s.end)
}

/**
 * For "step by step": the time at which the movement that is playing at `t` ends; when no
 * movement is playing, the end of the next one. Returns the total when nothing is left.
 */
export function nextStepEnd(timeline: Timeline, t: number): number {
  const next = timeline.segments.find((s) => t < s.end)
  return next ? next.end : timeline.total
}

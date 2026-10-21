import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYBACK, buildTimeline, frameAt, nextStepEnd, segmentIndexAt } from './playback'
import { computeAfter } from './situation'
import type { Ball, Shot } from './types'

const p = (x: number, y: number) => ({ x, y })

const before: Ball[] = [
  { id: 'W1', color: 'white', number: 1, position: p(300, 1200) },
  { id: 'R1', color: 'red', number: 1, position: p(450, 400) },
  { id: 'R2', color: 'red', number: 2, position: p(700, 900) },
]
const shot: Shot = {
  playedBallId: 'W1',
  movements: [
    // 900 mm long → exactly 1000 ms at 900 mm/s
    { order: 1, ballId: 'W1', path: [p(300, 1200), p(300, 300)], result: 'rest' },
    // 367 mm → 408 ms, below the minimum → 600 ms, plus 350 ms fade
    { order: 2, ballId: 'R1', path: [p(450, 400), p(450, 33)], result: 'scored' },
  ],
}
const timeline = buildTimeline(shot)

describe('buildTimeline', () => {
  it('plays movements one after the other with duration proportional to length', () => {
    expect(timeline.segments.map((s) => [s.start, s.arrive, s.end])).toEqual([
      [0, 1000, 1000],
      [1000, 1600, 1950],
    ])
    expect(timeline.total).toBe(1950)
  })

  it('applies the minimum duration and the score fade', () => {
    const seg = timeline.segments[1]!
    expect(seg.arrive - seg.start).toBe(DEFAULT_PLAYBACK.minMovementMs)
    expect(seg.end - seg.arrive).toBe(DEFAULT_PLAYBACK.scoreFadeMs)
  })

  it('uses the movement order, not the array order', () => {
    const reversed: Shot = { ...shot, movements: [...shot.movements].reverse() }
    expect(buildTimeline(reversed).segments.map((s) => s.ballId)).toEqual(['W1', 'R1'])
  })
})

describe('frameAt', () => {
  const frame = (t: number) => Object.fromEntries(frameAt(before, timeline, t).map((f) => [f.ball.id, f]))

  it('starts with the before-state', () => {
    const f = frame(0)
    expect(f.W1!.position).toEqual(p(300, 1200))
    expect(f.R1!.position).toEqual(p(450, 400))
    expect(f.R2!.position).toEqual(p(700, 900))
    expect(f.W1!.moving).toBe(false)
  })

  it('moves the played ball along its path first', () => {
    const f = frame(500)
    expect(f.W1!.position).toEqual(p(300, 750))
    expect(f.W1!.moving).toBe(true)
    expect(f.R1!.position).toEqual(p(450, 400))
    expect(f.R1!.moving).toBe(false)
  })

  it('then moves the next ball while the first rests at its end point', () => {
    const f = frame(1300)
    expect(f.W1!.position).toEqual(p(300, 300))
    expect(f.W1!.moving).toBe(false)
    expect(f.R1!.position.y).toBeCloseTo(400 - 367 / 2)
    expect(f.R1!.moving).toBe(true)
  })

  it('shrinks a scored ball into the hole and hides it afterwards', () => {
    const during = frame(1775).R1!
    expect(during.position).toEqual(p(450, 33))
    expect(during.scale).toBeCloseTo(0.5)
    expect(during.visible).toBe(true)
    const after = frame(1950).R1!
    expect(after.visible).toBe(false)
  })

  it('final frame equals computeAfter', () => {
    const final = frameAt(before, timeline, timeline.total)
      .filter((f) => f.visible)
      .map((f) => ({ ...f.ball, position: f.position }))
    expect(final).toEqual(computeAfter(before, shot))
  })

  it('untouched balls never move', () => {
    for (const t of [0, 400, 1200, 1900, 5000]) expect(frame(t).R2!.position).toEqual(p(700, 900))
  })
})

describe('segmentIndexAt / nextStepEnd', () => {
  it('finds the playing segment', () => {
    expect(segmentIndexAt(timeline, 0)).toBe(0)
    expect(segmentIndexAt(timeline, 999)).toBe(0)
    expect(segmentIndexAt(timeline, 1000)).toBe(1)
    expect(segmentIndexAt(timeline, 1950)).toBe(-1)
  })

  it('step by step stops at the end of each movement', () => {
    expect(nextStepEnd(timeline, 0)).toBe(1000)
    expect(nextStepEnd(timeline, 1000)).toBe(1950)
    expect(nextStepEnd(timeline, 1950)).toBe(1950)
  })
})

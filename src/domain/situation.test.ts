import { describe, expect, it } from 'vitest'
import { BALL_RADIUS, TABLE, pins } from '../table/geometry'
import { addBall, computeAfter, isValidBallPosition, moveBall, nextBallNumber, removeBall, reorderMovement, validateBefore, validateShot } from './situation'
import type { Ball } from './types'

const W = TABLE.width
const L = TABLE.length
const p = (x: number, y: number) => ({ x, y })

function place(colors: ('white' | 'red')[]): Ball[] {
  let balls: Ball[] = []
  colors.forEach((color, i) => {
    const next = addBall(balls, color, p(100 + i * 70, 300))
    if (!next) throw new Error('placement failed')
    balls = next
  })
  return balls
}

describe('numbering', () => {
  it('numbers balls per colour in order of placement', () => {
    const balls = place(['white', 'red', 'white', 'red', 'white'])
    expect(balls.map((b) => b.id)).toEqual(['W1', 'R1', 'W2', 'R2', 'W3'])
  })

  it('refuses a sixth ball of a colour', () => {
    const balls = place(['white', 'white', 'white', 'white', 'white'])
    expect(nextBallNumber(balls, 'white')).toBeNull()
    expect(addBall(balls, 'white', p(450, 900))).toBeNull()
    expect(nextBallNumber(balls, 'red')).toBe(1)
  })

  it('renumbers after removal so numbering stays sequential', () => {
    const balls = place(['white', 'white', 'white', 'red'])
    const after = removeBall(balls, 'W2')
    expect(after.map((b) => b.id)).toEqual(['W1', 'W2', 'R1'])
    // the old W3 became W2 and kept its position
    expect(after[1]!.position).toEqual(balls[2]!.position)
  })

  it('removing an unknown id is a no-op', () => {
    const balls = place(['white'])
    expect(removeBall(balls, 'R9')).toEqual(balls)
  })
})

describe('isValidBallPosition', () => {
  it('rejects positions off the table', () => {
    expect(isValidBallPosition(p(BALL_RADIUS - 1, 500), [])).toBe(false)
    expect(isValidBallPosition(p(W / 2, L - BALL_RADIUS + 1), [])).toBe(false)
    expect(isValidBallPosition(p(BALL_RADIUS, BALL_RADIUS), [])).toBe(true)
  })

  it('rejects positions on a pin', () => {
    expect(isValidBallPosition(pins[0]!.center, [])).toBe(false)
  })

  it('rejects overlap with another ball but allows touching', () => {
    const balls = place(['white'])
    const w1 = balls[0]!.position
    expect(isValidBallPosition(p(w1.x + 2 * BALL_RADIUS - 0.5, w1.y), balls)).toBe(false)
    expect(isValidBallPosition(p(w1.x + 2 * BALL_RADIUS, w1.y), balls)).toBe(true)
  })

  it('ignores the ball being moved', () => {
    const balls = place(['white'])
    const w1 = balls[0]!.position
    expect(isValidBallPosition(p(w1.x + 5, w1.y), balls, 'W1')).toBe(true)
  })
})

describe('moveBall', () => {
  it('moves to a valid position and refuses an invalid one', () => {
    const balls = place(['white', 'red'])
    const moved = moveBall(balls, 'W1', p(450, 900))
    expect(moved?.find((b) => b.id === 'W1')?.position).toEqual(p(450, 900))
    expect(moveBall(balls, 'W1', balls[1]!.position)).toBeNull()
    expect(moveBall(balls, 'X1', p(450, 900))).toBeNull()
  })
})

describe('validateBefore', () => {
  it('accepts a correctly placed set', () => {
    expect(validateBefore(place(['white', 'red', 'red']))).toEqual([])
  })

  it('reports duplicate ids, wrong ids, gaps and overlaps', () => {
    const bad: Ball[] = [
      { id: 'W1', color: 'white', number: 1, position: p(200, 300) },
      { id: 'W1', color: 'white', number: 1, position: p(200, 300) },
      { id: 'R3', color: 'red', number: 3, position: p(600, 300) },
      { id: 'R9', color: 'red', number: 2, position: p(640, 300) },
    ]
    const problems = validateBefore(bad)
    expect(problems.some((m) => m.includes('duplicate id'))).toBe(true)
    expect(problems.some((m) => m.includes('invalid position'))).toBe(true)
    expect(problems.some((m) => m.includes('does not match'))).toBe(true)
    expect(problems.some((m) => m.includes('not sequential'))).toBe(true)
  })
})

describe('shot', () => {
  const before: Ball[] = [
    { id: 'W1', color: 'white', number: 1, position: p(300, 1200) },
    { id: 'R1', color: 'red', number: 1, position: p(450, 400) },
    { id: 'R2', color: 'red', number: 2, position: p(700, 900) },
  ]
  const shot = {
    playedBallId: 'W1',
    movements: [
      { order: 1, ballId: 'W1', path: [p(300, 1200), p(BALL_RADIUS, 800), p(420, 450)], result: 'rest' as const },
      { order: 2, ballId: 'R1', path: [p(450, 400), p(450, 33)], result: 'scored' as const },
    ],
  }

  it('computeAfter: moved ball at end point, scored ball gone, untouched ball unchanged', () => {
    const after = computeAfter(before, shot)
    expect(after.map((b) => b.id)).toEqual(['W1', 'R2'])
    expect(after[0]!.position).toEqual(p(420, 450))
    expect(after[1]!.position).toEqual(p(700, 900))
    // input is not mutated
    expect(before[0]!.position).toEqual(p(300, 1200))
  })

  it('validateShot accepts the example', () => {
    expect(validateShot(before, shot)).toEqual([])
  })

  it('validateShot reports wrong start, order and played ball', () => {
    const bad = {
      playedBallId: 'R1',
      movements: [
        { order: 1, ballId: 'W1', path: [p(1, 1), p(100, 100)], result: 'rest' as const },
        { order: 3, ballId: 'R1', path: [p(450, 400)], result: 'rest' as const },
      ],
    }
    const problems = validateShot(before, bad)
    expect(problems.some((m) => m.includes('does not start'))).toBe(true)
    expect(problems.some((m) => m.includes('not sequential'))).toBe(true)
    expect(problems.some((m) => m.includes('order 1 must belong'))).toBe(true)
    expect(problems.some((m) => m.includes('no end point'))).toBe(true)
  })

  it('reorderMovement swaps neighbours but keeps the played ball first', () => {
    const ms = [
      { order: 1, ballId: 'W1', path: [], result: 'rest' as const },
      { order: 2, ballId: 'R1', path: [], result: 'rest' as const },
      { order: 3, ballId: 'R2', path: [], result: 'rest' as const },
    ]
    expect(reorderMovement(ms, 'R2', 'up').map((m) => m.ballId)).toEqual(['W1', 'R2', 'R1'])
    expect(reorderMovement(ms, 'R1', 'up').map((m) => m.ballId)).toEqual(['W1', 'R1', 'R2'])
    expect(reorderMovement(ms, 'W1', 'down').map((m) => m.ballId)).toEqual(['W1', 'R1', 'R2'])
    expect(reorderMovement(ms, 'R2', 'down').map((m) => m.order)).toEqual([1, 2, 3])
  })
})

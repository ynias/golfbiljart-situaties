import { describe, expect, it } from 'vitest'
import { BALL_RADIUS, TABLE, holes } from '../table/geometry'
import { clampToTable, isOnCushion, isScoringPoint, nearestHole, pathLength, positionAlongPath, snapToCushion } from './paths'

const p = (x: number, y: number) => ({ x, y })

describe('pathLength / positionAlongPath', () => {
  const path = [p(0, 0), p(100, 0), p(100, 50)]

  it('sums the segments', () => {
    expect(pathLength(path)).toBe(150)
    expect(pathLength([p(1, 1)])).toBe(0)
  })

  it('interpolates along the polyline and clamps at both ends', () => {
    expect(positionAlongPath(path, -5)).toEqual(p(0, 0))
    expect(positionAlongPath(path, 50)).toEqual(p(50, 0))
    expect(positionAlongPath(path, 100)).toEqual(p(100, 0))
    expect(positionAlongPath(path, 125)).toEqual(p(100, 25))
    expect(positionAlongPath(path, 999)).toEqual(p(100, 50))
  })

  it('handles a single point', () => {
    expect(positionAlongPath([p(3, 4)], 10)).toEqual(p(3, 4))
  })
})

describe('clampToTable / snapToCushion', () => {
  it('clamps the centre so the ball stays on the surface', () => {
    expect(clampToTable(p(-10, 5000))).toEqual(p(BALL_RADIUS, TABLE.length - BALL_RADIUS))
  })

  it('snaps near the cushion and leaves far points alone', () => {
    expect(snapToCushion(p(50, 900))).toEqual(p(BALL_RADIUS, 900))
    expect(snapToCushion(p(TABLE.width - 50, 900))).toEqual(p(TABLE.width - BALL_RADIUS, 900))
    expect(snapToCushion(p(450, 60))).toEqual(p(450, BALL_RADIUS))
    expect(snapToCushion(p(450, 900))).toEqual(p(450, 900))
  })

  it('snaps to both cushions in a corner', () => {
    expect(snapToCushion(p(40, 40))).toEqual(p(BALL_RADIUS, BALL_RADIUS))
  })

  it('isOnCushion recognises snapped points', () => {
    expect(isOnCushion(snapToCushion(p(50, 900)))).toBe(true)
    expect(isOnCushion(p(450, 900))).toBe(false)
  })
})

describe('holes', () => {
  it('finds the nearest hole', () => {
    expect(nearestHole(p(450, 100)).id).toBe('top')
    expect(nearestHole(p(450, 1700)).id).toBe('bottom')
  })

  it('isScoringPoint is true close to a hole centre', () => {
    expect(isScoringPoint(holes[0]!.center)).toBe(true)
    expect(isScoringPoint(p(450, holes[1]!.center.y + 40))).toBe(true)
    expect(isScoringPoint(p(450, 300))).toBe(false)
  })
})

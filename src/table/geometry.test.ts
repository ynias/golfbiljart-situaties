import { describe, expect, it } from 'vitest'
import {
  BALL_RADIUS,
  FRAME,
  HOLE_RADIUS,
  MARKS,
  PIN_RADIUS,
  TABLE,
  collidesWithPin,
  fromSvg,
  holes,
  isInHole,
  isInsideTable,
  lines,
  mirrorX,
  mirrorY,
  pins,
  toSvg,
  viewBox,
  type Orientation,
  type Point,
} from './geometry'

const W = TABLE.width
const L = TABLE.length
const approx = (a: Point, b: Point, eps = 1e-6) => Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps
const key = (p: Point) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`

describe('table dimensions', () => {
  it('playing surface is 900 × 1800 mm (1:2)', () => {
    expect(W).toBe(900)
    expect(L).toBe(1800)
    expect(L / W).toBe(2)
  })

  it('derived radii follow the norms', () => {
    expect(BALL_RADIUS).toBeCloseTo(30.75)
    expect(PIN_RADIUS).toBeCloseTo(17.5)
    expect(HOLE_RADIUS).toBeCloseTo(32.5)
  })

  it('hole centre is 867 mm from the table centre and the hole stays inside the surface', () => {
    expect(L / 2 - MARKS.holeCenterY).toBeCloseTo(867)
    expect(MARKS.holeCenterY - HOLE_RADIUS).toBeGreaterThanOrEqual(0)
  })
})

describe('pins', () => {
  it('has 12 pins: 4 goal pins and 8 centre pins', () => {
    expect(pins).toHaveLength(12)
    expect(pins.filter((p) => p.kind === 'goal')).toHaveLength(4)
    expect(pins.filter((p) => p.kind !== 'goal')).toHaveLength(8)
  })

  it('all pins lie fully inside the playing surface', () => {
    for (const pin of pins) {
      expect(pin.center.x - pin.radius).toBeGreaterThanOrEqual(0)
      expect(pin.center.x + pin.radius).toBeLessThanOrEqual(W)
      expect(pin.center.y - pin.radius).toBeGreaterThanOrEqual(0)
      expect(pin.center.y + pin.radius).toBeLessThanOrEqual(L)
    }
  })

  it('pins are symmetric top/bottom and left/right', () => {
    const set = new Set(pins.map((p) => key(p.center)))
    for (const pin of pins) {
      expect(set.has(key(mirrorX(pin.center)))).toBe(true)
      expect(set.has(key(mirrorY(pin.center)))).toBe(true)
    }
  })

  it('goal pins are 76.5 mm apart at 65 mm from the short cushion', () => {
    const [a, b] = pins.filter((p) => p.id.startsWith('goal-top'))
    expect(Math.abs(a!.center.x - b!.center.x)).toBeCloseTo(76.5)
    expect(a!.center.y).toBe(65)
  })

  it('centre pins sit at 90 and 180 mm from the centre on both axes', () => {
    const cx = W / 2
    const cy = L / 2
    const offsets = pins
      .filter((p) => p.kind !== 'goal')
      .map((p) => Math.hypot(p.center.x - cx, p.center.y - cy))
      .sort((a, b) => a - b)
    expect(offsets).toEqual([90, 90, 90, 90, 180, 180, 180, 180])
  })
})

describe('holes', () => {
  it('has a top and a bottom hole on the centre line, mirrored', () => {
    expect(holes).toHaveLength(2)
    expect(holes[0]!.center.x).toBe(W / 2)
    expect(approx(mirrorY(holes[0]!.center), holes[1]!.center)).toBe(true)
  })
})

describe('lines', () => {
  it('every line is mirrored left/right and top/bottom', () => {
    const set = new Set(lines.map((l) => l.points.map(key).sort().join('|')))
    for (const line of lines) {
      expect(set.has(line.points.map(mirrorX).map(key).sort().join('|'))).toBe(true)
      expect(set.has(line.points.map(mirrorY).map(key).sort().join('|'))).toBe(true)
    }
  })

  it('all line points lie on the playing surface', () => {
    for (const line of lines) {
      for (const p of line.points) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(W)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(L)
      }
    }
  })

  it('has four full-length long lines at the flight line and inner line', () => {
    const long = lines.filter((l) => l.kind === 'long')
    expect(long).toHaveLength(4)
    const xs = long.map((l) => l.points[0]!.x).sort((a, b) => a - b)
    expect(xs).toEqual([MARKS.outerLongLineX, MARKS.innerLongLineX, W - MARKS.innerLongLineX, W - MARKS.outerLongLineX])
  })

  it('diagonals run at 45° and end on the hole circle', () => {
    for (const d of lines.filter((l) => l.kind === 'diagonal')) {
      const [a, b] = d.points as [Point, Point]
      expect(Math.abs(b.x - a.x)).toBeCloseTo(Math.abs(b.y - a.y))
      const hole = holes.find((h) => Math.hypot(h.center.x - b.x, h.center.y - b.y) < HOLE_RADIUS + 1e-6)
      expect(hole).toBeDefined()
      expect(Math.hypot(hole!.center.x - b.x, hole!.center.y - b.y)).toBeCloseTo(HOLE_RADIUS)
    }
  })

  it('has 8 start marks (+)', () => {
    expect(lines.filter((l) => l.kind === 'start-mark')).toHaveLength(16)
  })

  it('diamond has four edges around the inner centre pins', () => {
    expect(lines.filter((l) => l.kind === 'diamond')).toHaveLength(4)
  })
})

describe('orientation', () => {
  const samples: Point[] = [
    { x: 0, y: 0 },
    { x: W, y: 0 },
    { x: 0, y: L },
    { x: W, y: L },
    { x: 123.4, y: 567.8 },
    { x: W / 2, y: L / 2 },
  ]

  it.each<Orientation>(['portrait', 'landscape'])('fromSvg(toSvg(p)) ≈ p in %s', (orientation) => {
    for (const p of samples) {
      expect(approx(fromSvg(toSvg(p, orientation), orientation), p)).toBe(true)
    }
  })

  it('portrait is the identity', () => {
    expect(toSvg({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
  })

  it('landscape puts the top end of the table on the left', () => {
    expect(toSvg({ x: W / 2, y: 0 }, 'landscape')).toEqual({ x: 0, y: W / 2 })
    expect(toSvg({ x: W / 2, y: L }, 'landscape')).toEqual({ x: L, y: W / 2 })
  })

  it('viewBox includes cushion and rail on all sides', () => {
    const p = viewBox('portrait')
    expect(p).toEqual({ x: -FRAME, y: -FRAME, width: W + 2 * FRAME, height: L + 2 * FRAME })
    const l = viewBox('landscape')
    expect(l.width).toBe(p.height)
    expect(l.height).toBe(p.width)
  })
})

describe('collision helpers', () => {
  it('isInsideTable requires the whole ball on the surface', () => {
    expect(isInsideTable({ x: W / 2, y: L / 2 })).toBe(true)
    expect(isInsideTable({ x: BALL_RADIUS, y: BALL_RADIUS })).toBe(true)
    expect(isInsideTable({ x: BALL_RADIUS - 0.1, y: L / 2 })).toBe(false)
    expect(isInsideTable({ x: W / 2, y: L - BALL_RADIUS + 0.1 })).toBe(false)
  })

  it('collidesWithPin detects overlap with any pin', () => {
    const pin = pins.find((p) => p.id === 'centre-outer-left')!
    expect(collidesWithPin(pin.center)).toBe(true)
    expect(collidesWithPin({ x: pin.center.x - BALL_RADIUS - PIN_RADIUS - 0.1, y: pin.center.y })).toBe(false)
    expect(collidesWithPin({ x: pin.center.x - BALL_RADIUS - PIN_RADIUS + 0.1, y: pin.center.y })).toBe(true)
    expect(collidesWithPin({ x: 300, y: 300 })).toBe(false)
  })

  it('isInHole is true inside either hole', () => {
    expect(isInHole(holes[0]!.center)).toBe(true)
    expect(isInHole(holes[1]!.center)).toBe(true)
    expect(isInHole({ x: W / 2, y: L / 2 })).toBe(false)
  })
})

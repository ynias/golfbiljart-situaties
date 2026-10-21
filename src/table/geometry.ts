/**
 * Golf billiards table geometry.
 *
 * Everything is expressed in millimetres with the origin at the top-left corner of the
 * playing surface (inside the cushions), x across the width, y along the length.
 * Portrait orientation (holes at top and bottom) is the canonical form; landscape is a
 * rotation applied in `toSvg` / `fromSvg` and in the table component.
 *
 * Sources:
 * - Official norms ("Standaardnormen biljart"): playing surface 900 × 1800, hole Ø65 at
 *   867 mm from the table centre, goal pins 76–77 mm apart at 65 mm from the short cushion,
 *   centre pins at 90 and 180 mm from the centre on both axes, pins Ø35, flight line
 *   ("vlieglijn") 92.3 mm from the long cushion, start marks 75 mm from the short cushion.
 * - docs/reference/tafel-2.png for everything the norms do not specify (inner long lines,
 *   cross lines, diagonals, X mark, dashes). See docs/table-notes.md.
 */

export interface Point {
  x: number
  y: number
}

export type Orientation = 'portrait' | 'landscape'

/** Base dimensions in mm. Every other value is derived from these. */
export const TABLE = {
  /** Playing surface width (inside the cushions). */
  width: 900,
  /** Playing surface length (inside the cushions). */
  length: 1800,
  /** Visible rubber cushion strip around the playing surface. */
  cushion: 26,
  /** Wooden rail outside the cushion. */
  rail: 66,
  ballDiameter: 61.5,
  pinDiameter: 35,
  holeDiameter: 65,
} as const

export const BALL_RADIUS = TABLE.ballDiameter / 2
export const PIN_RADIUS = TABLE.pinDiameter / 2
export const HOLE_RADIUS = TABLE.holeDiameter / 2

const W = TABLE.width
const L = TABLE.length
const CX = W / 2
const CY = L / 2

/** Positions of the markings, in mm, for the top half of the table. */
export const MARKS = {
  /** Flight line ("vlieglijn"), distance from the long cushion. */
  outerLongLineX: 92.3,
  /** Inner long line, distance from the long cushion (measured on tafel-2). */
  innerLongLineX: 257,
  /** Cross line between outer and inner long line, distance from the short cushion (tafel-2). */
  crossLineY: 426,
  /** Start marks (+): distance from the short cushion and x positions. */
  startMarkY: 75,
  startMarkXs: [150, 300, 600, 750],
  startMarkArm: 20,
  /** Hole centre, distance from the short cushion (867 mm from the table centre). */
  holeCenterY: CY - 867,
  /** Goal pins: distance from the short cushion and half of the spacing (76.5 mm). */
  goalPinY: 65,
  goalPinHalfSpacing: 38.25,
  /** Centre pins: inner and outer distance from the table centre on both axes. */
  centrePinInner: 90,
  centrePinOuter: 180,
  /** X mark under the hole: two lines crossing on the centre line, with a short bar (tafel-2). */
  xMarkCrossingY: 155,
  xMarkHalfWidth: 45,
  xMarkEndY: 245,
  xMarkBarHalfWidth: HOLE_RADIUS,
  /** Middle line dashes outside the flight lines (tafel-2). */
  dashLength: 9,
  dashPitch: 19,
} as const

// ---------------------------------------------------------------------------------------
// Mirroring helpers
// ---------------------------------------------------------------------------------------

export const mirrorX = (p: Point): Point => ({ x: W - p.x, y: p.y })
export const mirrorY = (p: Point): Point => ({ x: p.x, y: L - p.y })

// ---------------------------------------------------------------------------------------
// Pins and holes
// ---------------------------------------------------------------------------------------

export type PinKind = 'goal' | 'centre-inner' | 'centre-outer'

export interface Pin {
  id: string
  kind: PinKind
  center: Point
  radius: number
}

export interface Hole {
  id: 'top' | 'bottom'
  center: Point
  radius: number
}

const pin = (id: string, kind: PinKind, center: Point): Pin => ({ id, kind, center, radius: PIN_RADIUS })

export const pins: readonly Pin[] = [
  pin('goal-top-left', 'goal', { x: CX - MARKS.goalPinHalfSpacing, y: MARKS.goalPinY }),
  pin('goal-top-right', 'goal', { x: CX + MARKS.goalPinHalfSpacing, y: MARKS.goalPinY }),
  pin('goal-bottom-left', 'goal', mirrorY({ x: CX - MARKS.goalPinHalfSpacing, y: MARKS.goalPinY })),
  pin('goal-bottom-right', 'goal', mirrorY({ x: CX + MARKS.goalPinHalfSpacing, y: MARKS.goalPinY })),
  pin('centre-inner-top', 'centre-inner', { x: CX, y: CY - MARKS.centrePinInner }),
  pin('centre-inner-bottom', 'centre-inner', { x: CX, y: CY + MARKS.centrePinInner }),
  pin('centre-inner-left', 'centre-inner', { x: CX - MARKS.centrePinInner, y: CY }),
  pin('centre-inner-right', 'centre-inner', { x: CX + MARKS.centrePinInner, y: CY }),
  pin('centre-outer-top', 'centre-outer', { x: CX, y: CY - MARKS.centrePinOuter }),
  pin('centre-outer-bottom', 'centre-outer', { x: CX, y: CY + MARKS.centrePinOuter }),
  pin('centre-outer-left', 'centre-outer', { x: CX - MARKS.centrePinOuter, y: CY }),
  pin('centre-outer-right', 'centre-outer', { x: CX + MARKS.centrePinOuter, y: CY }),
]

export const holes: readonly Hole[] = [
  { id: 'top', center: { x: CX, y: MARKS.holeCenterY }, radius: HOLE_RADIUS },
  { id: 'bottom', center: mirrorY({ x: CX, y: MARKS.holeCenterY }), radius: HOLE_RADIUS },
]

// ---------------------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------------------

export type LineKind =
  | 'long'
  | 'cross'
  | 'diagonal'
  | 'middle'
  | 'middle-dash'
  | 'start-mark'
  | 'x-mark'
  | 'x-mark-bar'
  | 'diamond'

export interface Line {
  id: string
  kind: LineKind
  /** Polyline in mm; two points for a straight segment. */
  points: Point[]
}

/**
 * End point of the 45° diagonal that starts at (outerLongLineX, crossLineY) and runs towards
 * the hole: the first intersection with the hole circle.
 */
function diagonalEnd(): Point {
  const start = { x: MARKS.outerLongLineX, y: MARKS.crossLineY }
  const h = holes[0]!.center
  // Parametrise: p(t) = (start.x + t, start.y - t). Solve |p(t) - h|² = r².
  const dx = start.x - h.x
  const dy = start.y - h.y
  // (dx + t)² + (dy - t)² = r²  →  2t² + 2(dx - dy)t + dx² + dy² - r² = 0
  const a = 2
  const b = 2 * (dx - dy)
  const c = dx * dx + dy * dy - HOLE_RADIUS * HOLE_RADIUS
  const disc = b * b - 4 * a * c
  const t = (-b - Math.sqrt(disc)) / (2 * a)
  return { x: start.x + t, y: start.y - t }
}

function topHalfLines(): Line[] {
  const lines: Line[] = []
  const seg = (id: string, kind: LineKind, a: Point, b: Point) => lines.push({ id, kind, points: [a, b] })

  // Long lines run the full length; they are added once (not mirrored vertically).
  // Cross lines between the outer and inner long lines.
  seg('cross', 'cross', { x: MARKS.outerLongLineX, y: MARKS.crossLineY }, { x: MARKS.innerLongLineX, y: MARKS.crossLineY })

  // Diagonal from the cross-line corner towards the hole.
  seg('diagonal', 'diagonal', { x: MARKS.outerLongLineX, y: MARKS.crossLineY }, diagonalEnd())

  // Start marks (+).
  for (const x of MARKS.startMarkXs.filter((x) => x < CX)) {
    const y = MARKS.startMarkY
    seg(`start-mark-${x}-h`, 'start-mark', { x: x - MARKS.startMarkArm, y }, { x: x + MARKS.startMarkArm, y })
    seg(`start-mark-${x}-v`, 'start-mark', { x, y: y - MARKS.startMarkArm }, { x, y: y + MARKS.startMarkArm })
  }

  // X mark under the hole: line from under the left goal pin through the crossing point.
  seg(
    'x-mark',
    'x-mark',
    { x: CX - MARKS.xMarkHalfWidth, y: MARKS.goalPinY },
    { x: CX + MARKS.xMarkHalfWidth, y: MARKS.xMarkEndY },
  )
  seg(
    'x-mark-bar',
    'x-mark-bar',
    { x: CX - MARKS.xMarkBarHalfWidth, y: MARKS.xMarkCrossingY },
    { x: CX + MARKS.xMarkBarHalfWidth, y: MARKS.xMarkCrossingY },
  )

  // Middle line: dashes from the cushion to the flight line, solid from flight line to inner long line.
  for (let x = 0; x + MARKS.dashLength <= MARKS.outerLongLineX; x += MARKS.dashPitch) {
    seg(`middle-dash-${x}`, 'middle-dash', { x, y: CY }, { x: x + MARKS.dashLength, y: CY })
  }
  seg('middle', 'middle', { x: MARKS.outerLongLineX, y: CY }, { x: MARKS.innerLongLineX, y: CY })

  // Diamond around the inner centre pins; vertices at pin centre + pin radius.
  const d = MARKS.centrePinInner + PIN_RADIUS
  seg('diamond', 'diamond', { x: CX, y: CY - d }, { x: CX - d, y: CY })

  return lines
}

function buildLines(): Line[] {
  const quarter = topHalfLines()
  const out: Line[] = []
  const mirrored = (line: Line, suffix: string, f: (p: Point) => Point): Line => ({
    id: `${line.id}-${suffix}`,
    kind: line.kind,
    points: line.points.map(f),
  })
  for (const line of quarter) {
    out.push(mirrored(line, 'tl', (p) => p))
    out.push(mirrored(line, 'tr', mirrorX))
    out.push(mirrored(line, 'bl', mirrorY))
    out.push(mirrored(line, 'br', (p) => mirrorY(mirrorX(p))))
  }
  // Symmetric elements that live on the mirror axis are produced twice; deduplicate by geometry.
  const seen = new Set<string>()
  const unique = out.filter((l) => {
    const key = l.points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).sort().join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  // Full-length long lines.
  for (const x of [MARKS.outerLongLineX, MARKS.innerLongLineX]) {
    unique.push({ id: `long-${x}`, kind: 'long', points: [{ x, y: 0 }, { x, y: L }] })
    unique.push({ id: `long-${W - x}`, kind: 'long', points: [{ x: W - x, y: 0 }, { x: W - x, y: L }] })
  }
  return unique
}

export const lines: readonly Line[] = buildLines()

// ---------------------------------------------------------------------------------------
// Orientation / SVG coordinates
// ---------------------------------------------------------------------------------------

/** Total extent around the playing surface taken by cushion + rail, in mm. */
export const FRAME = TABLE.cushion + TABLE.rail

/** Canonical (portrait) point → SVG user coordinates for the given orientation. */
export function toSvg(p: Point, orientation: Orientation = 'portrait'): Point {
  if (orientation === 'portrait') return { x: p.x, y: p.y }
  // Rotate 90° counter-clockwise: the top end of the table becomes the left end.
  return { x: p.y, y: W - p.x }
}

/** SVG user coordinates for the given orientation → canonical (portrait) point. */
export function fromSvg(p: Point, orientation: Orientation = 'portrait'): Point {
  if (orientation === 'portrait') return { x: p.x, y: p.y }
  return { x: W - p.y, y: p.x }
}

/** SVG transform that maps canonical coordinates to the given orientation. */
export function orientationTransform(orientation: Orientation): string {
  return orientation === 'portrait' ? '' : `translate(0 ${W}) rotate(-90)`
}

/** viewBox (in mm) that includes cushion and rail. */
export function viewBox(orientation: Orientation): { x: number; y: number; width: number; height: number } {
  const w = W + 2 * FRAME
  const l = L + 2 * FRAME
  return orientation === 'portrait'
    ? { x: -FRAME, y: -FRAME, width: w, height: l }
    : { x: -FRAME, y: -FRAME, width: l, height: w }
}

// ---------------------------------------------------------------------------------------
// Collision helpers
// ---------------------------------------------------------------------------------------

/** True when a ball with the given radius centred at `p` lies completely on the playing surface. */
export function isInsideTable(p: Point, ballRadius: number = BALL_RADIUS): boolean {
  return p.x >= ballRadius && p.x <= W - ballRadius && p.y >= ballRadius && p.y <= L - ballRadius
}

/** True when a ball centred at `p` overlaps any pin. */
export function collidesWithPin(p: Point, ballRadius: number = BALL_RADIUS): boolean {
  return pins.some((pin) => distance(p, pin.center) < ballRadius + pin.radius)
}

/** True when the centre of a ball at `p` lies within a hole (the ball is scored). */
export function isInHole(p: Point, tolerance = 0): boolean {
  return holes.some((hole) => distance(p, hole.center) <= hole.radius + tolerance)
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

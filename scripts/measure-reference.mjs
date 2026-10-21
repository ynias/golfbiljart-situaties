// Dev helper: measures line/pin/hole positions in docs/reference/tafel-2.png as fractions of the playing surface.
import fs from 'node:fs'
import { PNG } from 'pngjs'

const png = PNG.sync.read(fs.readFileSync('docs/reference/tafel-2.png'))
const { width: W, height: H, data } = png
const px = (x, y) => { const i = (y * W + x) * 4; return [data[i], data[i + 1], data[i + 2]] }
const isDark = (x, y) => { const [r, g, b] = px(x, y); return r < 60 && g < 60 && b < 60 }
const isCloth = (x, y) => { const [r, g, b] = px(x, y); return r < 40 && g > 90 && g < 130 && b > 80 && b < 120 }
const isGrey = (x, y) => { const [r, g, b] = px(x, y); return r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 20 }

// playing surface bounds: scan the middle row/column for cloth
const midY = Math.floor(H / 2), midX = Math.floor(W / 2)
let left = 0; while (!isCloth(left, midY + 60)) left++
let right = W - 1; while (!isCloth(right, midY + 60)) right--
let top = 0; while (!isCloth(midX + 100, top)) top++
let bottom = H - 1; while (!isCloth(midX + 100, bottom)) bottom--
console.log('surface px', { left, right, top, bottom, w: right - left + 1, h: bottom - top + 1, ratio: (bottom - top + 1) / (right - left + 1) })
const fw = (x) => ((x - left) / (right - left + 1)).toFixed(4)
const fh = (y) => ((y - top) / (bottom - top + 1)).toFixed(4)

// vertical lines: dark runs along a row at y = 0.35 L (between cross lines and centre)
const row = Math.round(top + 0.35 * (bottom - top))
const runs = []
for (let x = left; x <= right; x++) { if (isDark(x, row)) { if (runs.length && runs[runs.length - 1].end === x - 1) runs[runs.length - 1].end = x; else runs.push({ start: x, end: x }) } }
console.log('vertical lines at y=0.35L (x frac):', runs.map(r => fw((r.start + r.end) / 2)))

// horizontal lines: dark runs along a column at x = 0.19 W (between outer and inner long line)
const col = Math.round(left + 0.19 * (right - left))
const hr = []
for (let y = top; y <= bottom; y++) { if (isDark(col, y)) { if (hr.length && hr[hr.length - 1].end === y - 1) hr[hr.length - 1].end = y; else hr.push({ start: y, end: y }) } }
console.log('horizontal features at x=0.19W (y frac):', hr.map(r => fh((r.start + r.end) / 2)))
// same at x = 0.5 W (centre column): hole, pins, X mark, diamond
const col2 = midX
const hr2 = []
for (let y = top; y <= bottom; y++) { if (isDark(col2, y)) { if (hr2.length && hr2[hr2.length - 1].end === y - 1) hr2[hr2.length - 1].end = y; else hr2.push({ start: y, end: y }) } }
console.log('dark at x=0.5W (y frac start-end):', hr2.map(r => fh(r.start) + '-' + fh(r.end)))

// grey pins: connected components of grey pixels
const seen = new Uint8Array(W * H); const pins = []
for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
  if (seen[y * W + x] || !isGrey(x, y)) continue
  const stack = [[x, y]]; let n = 0, sx = 0, sy = 0; seen[y * W + x] = 1
  while (stack.length) { const [cx, cy] = stack.pop(); n++; sx += cx; sy += cy
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = cx + dx, ny = cy + dy; if (nx < left || nx > right || ny < top || ny > bottom) continue; if (!seen[ny * W + nx] && isGrey(nx, ny)) { seen[ny * W + nx] = 1; stack.push([nx, ny]) } } }
  if (n > 50) pins.push({ x: fw(sx / n), y: fh(sy / n), r: (Math.sqrt(n / Math.PI) / (right - left + 1)).toFixed(4) })
}
console.log('grey pins (x, y frac, r frac of W):'); pins.forEach(p => console.log(' ', p.x, p.y, p.r))

// crosses: look for dark pixels on row y = 0.0375 L outside the pins
const crow = Math.round(top + 0.0375 * (bottom - top))
const cr = []
for (let x = left; x <= right; x++) { if (isDark(x, crow)) { if (cr.length && cr[cr.length - 1].end >= x - 2) cr[cr.length - 1].end = x; else cr.push({ start: x, end: x }) } }
console.log('dark runs at y=0.0375L (x frac, width px):', cr.map(r => fw((r.start + r.end) / 2) + ' w' + (r.end - r.start + 1)))
// hole: black blob at top centre
let hy0 = top; while (!isDark(midX, hy0) && hy0 < midY) hy0++
let hy1 = hy0; while (isDark(midX, hy1)) hy1++
let hx0 = midX; while (isDark(hx0, hy0 + 5)) hx0--
let hx1 = midX; while (isDark(hx1, hy0 + 5)) hx1++
console.log('hole top: y', fh(hy0), '-', fh(hy1), ' width frac', ((hx1 - hx0) / (right - left + 1)).toFixed(4))

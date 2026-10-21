# Table drawing: notes and comparison with the reference images

Rendered output: `docs/render/table-*.png` (regenerate with `node scripts\render-table.mjs`).
Reference images: `docs/reference/tafel-1.png` (green theme), `tafel-2.png` (teal theme, primary
reference for the markings), `tafel-3.png` (landscape, with balls).

## Sources used, in order of precedence

1. **Official norms** supplied by the owner (playing surface 900 × 1800, hole Ø65 at 867 mm
   from the centre, goal pins 76.5 mm apart at 65 mm from the short cushion, centre pins at
   90 / 180 mm, pins Ø35, flight line at 92.3 mm, start marks at 75 mm, ball Ø61.5).
2. **tafel-2.png**, measured pixel-precisely (`scripts/measure-reference*.mjs`). The inner
   playing surface in that image is 801 × 1600 px (exactly 1:2) and sits inside a lighter
   cushion strip; all fractions below are relative to that inner surface.

## How tafel-2 compares with the norms

The drawing is internally consistent but roughly 5 % "smaller" than the norms around the
pins and holes (e.g. centre pins at 85.5 / 171 mm instead of 90 / 180, goal pins at 62 mm
instead of 65, start marks at 72 mm instead of 75). The norms win; the deviations are below
what is visible at phone size.

## Values taken from tafel-2 (not in the norms)

| Element | Measured | Used |
|---|---|---|
| Inner long lines | 257 mm from the long cushion | 257 |
| Cross lines | 426 mm from the short cushion, between outer and inner long line | 426 |
| Start marks (+) x positions | 150.6, 300, 599, 749 mm | 150, 300, 600, 750 |
| Start mark arm | ±21 mm | ±20 |
| Diagonals | from (flight line, cross line) at ~45° up to the hole | exact 45°, clipped at the hole circle |
| X mark under the hole | two lines from under the goal pins crossing at 152–155 mm from the cushion, ending at ~243 mm | crossing at 155, from (±45, 65) to (∓45, 245) |
| Bar on the X mark | at 155 mm, 65 mm wide | 65 mm (= hole diameter) |
| Middle line | dashes 9 mm long / 19 mm pitch from the cushion to the flight line; solid from there to the inner long line; nothing between the inner long lines | same |
| Diamond | 45° edges with vertices ~105 mm from the centre (the lines run into the pin circles) | vertices at 90 + 17.5 = 107.5 mm |
| Cushion strip | 26 mm | 26 |
| Rail | 66 mm | 66 (the norm's 120/130 mm "band" includes the rail; drawing kept lighter on purpose) |

## Deliberate deviations

- **Hole position**: the owner chose "like tafel-1": the hole lies completely on the playing
  surface. With the norm (centre 33 mm from the cushion, radius 32.5) it touches the cushion.
  tafel-2 draws it half under the cushion.
- **Pin size**: norm Ø35 incl. the red ring; tafel-2's pins are ~Ø25 with the ring. The
  rendered pins therefore look slightly larger than in tafel-2.
- **Line width**: 1 device pixel (`vector-effect: non-scaling-stroke`); tafel-2 uses ~4.5 mm.
  The norm says max 0.7 mm, so thin is correct.
- **Landscape**: rotation of the canonical portrait drawing by 90° counter-clockwise (the top
  end goes to the left). Which end is "home" for white or red is a convention the user
  keeps; the editor does nothing with it.

## Open points

- The inner long line (257) and cross line (426) values are measurements, not norms. If the
  official values turn out to be e.g. 255 / 425 they are a one-line change in `MARKS`.

// Renders BilliardTable.vue to PNG for visual comparison with docs/reference/.
// Usage: node scripts\render-table.mjs  → docs/render/table-<orientation>-<theme>.png
import fs from 'node:fs'
import path from 'node:path'
import { createServer } from 'vite'
import { Resvg } from '@resvg/resvg-js'

const root = process.cwd()
const outDir = path.join(root, 'docs', 'render')
fs.mkdirSync(outDir, { recursive: true })

const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { renderTable } = await server.ssrLoadModule('/scripts/render-entry.ts')
  const variants = [
    ['portrait', 'teal'],
    ['portrait', 'green'],
    ['landscape', 'teal'],
  ]
  for (const [orientation, theme] of variants) {
    const svg = await renderTable(orientation, theme)
    if (process.env.DUMP_SVG) fs.writeFileSync(path.join(outDir, `table-${orientation}-${theme}.svg`), svg)
    const width = orientation === 'portrait' ? 1121 : 1920
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: '#fdfcf8' }).render().asPng()
    const file = path.join(outDir, `table-${orientation}-${theme}.png`)
    fs.writeFileSync(file, png)
    console.log('wrote', path.relative(root, file))
  }
} finally {
  await server.close()
}

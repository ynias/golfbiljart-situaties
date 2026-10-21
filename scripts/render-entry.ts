// SSR entry used by render-table.mjs: renders BilliardTable.vue to an SVG string.
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import BilliardTable from '../src/components/BilliardTable.vue'
import type { Orientation } from '../src/table/geometry'
import type { ThemeName } from '../src/table/themes'

export async function renderTable(orientation: Orientation, theme: ThemeName): Promise<string> {
  const app = createSSRApp({ render: () => h(BilliardTable, { orientation, theme }) })
  const html = await renderToString(app)
  return (
    html
      // Scoped-style attributes have no value in HTML; XML needs one.
      .replace(/\s(data-v-[\w-]+)(?=[\s>/])/g, ' $1=""')
      // The SSR compiler lowercases these SVG attributes; XML is case-sensitive.
      .replace(' viewbox=', ' viewBox=')
      .replace(' preserveaspectratio=', ' preserveAspectRatio=')
      // Scoped styles are not inlined by SSR; add the line style so the rasteriser applies it.
      .replace(/(<svg[^>]*>)/, '$1<style>.table-lines polyline{stroke-width:1px;vector-effect:non-scaling-stroke}</style>')
  )
}

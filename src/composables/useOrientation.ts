import { onMounted, onUnmounted, ref } from 'vue'
import type { Orientation } from '../table/geometry'

/** Portrait on narrow screens, landscape from the `md` breakpoint (768px) upwards. */
export function useOrientation(minWidth = 768) {
  const orientation = ref<Orientation>('portrait')
  let mql: MediaQueryList | null = null
  const update = () => {
    orientation.value = mql?.matches ? 'landscape' : 'portrait'
  }
  onMounted(() => {
    mql = window.matchMedia(`(min-width: ${minWidth}px)`)
    mql.addEventListener('change', update)
    update()
  })
  onUnmounted(() => mql?.removeEventListener('change', update))
  return orientation
}

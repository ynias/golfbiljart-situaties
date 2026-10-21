import { reactive, readonly, type Ref } from 'vue'
import type { Ball, BallColor, Point } from '../domain/types'
import { isValidBallPosition } from '../domain/situation'
import type { SituationEditor } from './useSituationEditor'

export interface TableHandle {
  clientToTable(clientX: number, clientY: number): Point | null
  pixelsPerMm(): number
  svg: SVGSVGElement | null
}

export interface DragState {
  /** 'tray': a new ball being dragged from the tray; 'table': an existing ball being moved. */
  source: 'tray' | 'table' | null
  color: BallColor | null
  ballId: string | null
  /** Current pointer position in client pixels (for the HTML ghost). */
  client: { x: number; y: number }
  /** Current position in table mm, null when the pointer is outside the table SVG. */
  table: Point | null
  /** Whether a drop at the current position would be valid. */
  valid: boolean
  /** Whether the pointer is over the tray (dropping a table ball there removes it). */
  overTray: boolean
  /** Id of the ball that was just refused, for the shake animation. */
  invalidBallId: string | null
}

/**
 * Pointer-based drag and drop for balls (mouse and touch). Handles both dragging a new ball from
 * the tray onto the table and moving a ball that already lies on the table (or back to the tray).
 */
export function useBallDrag(
  editor: SituationEditor,
  table: Ref<TableHandle | null>,
  tray: Ref<HTMLElement | null>,
) {
  const drag = reactive<DragState>({
    source: null,
    color: null,
    ballId: null,
    client: { x: 0, y: 0 },
    table: null,
    valid: false,
    overTray: false,
    invalidBallId: null,
  })

  let captured: Element | null = null
  let invalidTimer: ReturnType<typeof setTimeout> | null = null

  function isOverSvg(x: number, y: number): boolean {
    const svg = table.value?.svg
    if (!svg) return false
    const r = svg.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  function isOverTray(x: number, y: number): boolean {
    const r = tray.value?.getBoundingClientRect()
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  function update(event: PointerEvent) {
    drag.client = { x: event.clientX, y: event.clientY }
    drag.overTray = drag.source === 'table' && isOverTray(event.clientX, event.clientY)
    const over = isOverSvg(event.clientX, event.clientY)
    drag.table = over ? (table.value?.clientToTable(event.clientX, event.clientY) ?? null) : null
    drag.valid =
      drag.table !== null && isValidBallPosition(drag.table, editor.state.balls as Ball[], drag.ballId ?? undefined)
  }

  function listen(el: Element, event: PointerEvent) {
    captured = el
    try {
      el.setPointerCapture(event.pointerId)
    } catch {
      /* capture is best-effort */
    }
    el.addEventListener('pointermove', onMove as EventListener)
    el.addEventListener('pointerup', onUp as EventListener)
    el.addEventListener('pointercancel', onCancel as EventListener)
  }

  function unlisten() {
    if (!captured) return
    captured.removeEventListener('pointermove', onMove as EventListener)
    captured.removeEventListener('pointerup', onUp as EventListener)
    captured.removeEventListener('pointercancel', onCancel as EventListener)
    captured = null
  }

  function startFromTray(color: BallColor, event: PointerEvent) {
    if (!editor.canAdd(color)) return
    drag.source = 'tray'
    drag.color = color
    drag.ballId = null
    update(event)
    listen(event.currentTarget as Element, event)
  }

  function startFromTable(ball: Ball, event: PointerEvent) {
    drag.source = 'table'
    drag.color = ball.color
    drag.ballId = ball.id
    update(event)
    listen(event.currentTarget as Element, event)
  }

  function onMove(event: PointerEvent) {
    if (!drag.source) return
    update(event)
  }

  function flagInvalid(id: string | null) {
    drag.invalidBallId = id
    if (invalidTimer) clearTimeout(invalidTimer)
    invalidTimer = setTimeout(() => (drag.invalidBallId = null), 450)
  }

  function onUp(event: PointerEvent) {
    if (!drag.source) return
    update(event)
    if (drag.source === 'tray' && drag.color) {
      if (drag.table && drag.valid) editor.addBall(drag.color, drag.table)
    } else if (drag.source === 'table' && drag.ballId) {
      if (drag.overTray) editor.removeBall(drag.ballId)
      else if (drag.table && drag.valid) editor.moveBall(drag.ballId, drag.table)
      else flagInvalid(drag.ballId)
    }
    end()
  }

  function onCancel() {
    if (drag.source === 'table' && drag.ballId) flagInvalid(drag.ballId)
    end()
  }

  function end() {
    unlisten()
    drag.source = null
    drag.color = null
    drag.ballId = null
    drag.table = null
    drag.valid = false
    drag.overTray = false
  }

  return { drag: readonly(drag), startFromTray, startFromTable }
}

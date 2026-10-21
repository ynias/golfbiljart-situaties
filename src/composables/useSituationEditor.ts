import { computed, reactive, readonly } from 'vue'
import { isScoringPoint, nearestHole, snapToCushion } from '../domain/paths'
import {
  addBall as addBallRule,
  computeAfter,
  moveBall as moveBallRule,
  nextBallNumber,
  nextMovementOrder,
  normalizeOrders,
  removeBall as removeBallRule,
  reorderMovement,
  sortedMovements,
  validateBefore,
  validateShot,
} from '../domain/situation'
import {
  MAX_AUTHOR_LENGTH,
  MAX_BALLS_PER_COLOR,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  type Ball,
  type BallColor,
  type Movement,
  type Point,
  type Shot,
} from '../domain/types'

export type EditorStep = 'before' | 'shot'
export type EditorView = 'before' | 'after' | 'play'

export interface EditorState {
  title: string
  description: string
  authorName: string
  balls: Ball[]
  step: EditorStep
  /** Which state the table shows while editing the shot. */
  view: EditorView
  playedBallId: string | null
  movements: Movement[]
  /** Ball whose path is currently being drawn (shot step). */
  currentBallId: string | null
}

/** Editor state for a situation. Positions are in mm; validation uses the domain rules. */
export function useSituationEditor(initial?: Partial<EditorState>) {
  const state = reactive<EditorState>({
    title: '',
    description: '',
    authorName: '',
    balls: [],
    step: 'before',
    view: 'before',
    playedBallId: null,
    movements: [],
    currentBallId: null,
    ...initial,
  })

  // ---- before-state --------------------------------------------------------------------

  const remaining = computed<Record<BallColor, number>>(() => ({
    white: MAX_BALLS_PER_COLOR - state.balls.filter((b) => b.color === 'white').length,
    red: MAX_BALLS_PER_COLOR - state.balls.filter((b) => b.color === 'red').length,
  }))

  const fieldErrors = computed(() => {
    const errors: Partial<Record<'title' | 'description' | 'authorName' | 'balls', string>> = {}
    if (state.title.trim().length === 0) errors.title = 'Geef een titel.'
    else if (state.title.trim().length > MAX_TITLE_LENGTH) errors.title = `Maximum ${MAX_TITLE_LENGTH} tekens.`
    if (state.description.length > MAX_DESCRIPTION_LENGTH) errors.description = `Maximum ${MAX_DESCRIPTION_LENGTH} tekens.`
    if (state.authorName.length > MAX_AUTHOR_LENGTH) errors.authorName = `Maximum ${MAX_AUTHOR_LENGTH} tekens.`
    if (state.balls.length === 0) errors.balls = 'Leg minstens één bal op de tafel.'
    else if (validateBefore(state.balls).length > 0) errors.balls = 'De ballen liggen niet geldig.'
    return errors
  })

  const canContinue = computed(() => Object.keys(fieldErrors.value).length === 0)

  function canAdd(color: BallColor): boolean {
    return nextBallNumber(state.balls, color) !== null
  }

  /** Adds a ball; returns the new ball or null when the position/limit does not allow it. */
  function addBall(color: BallColor, position: Point): Ball | null {
    const next = addBallRule(state.balls, color, position)
    if (!next) return null
    state.balls = next
    return next[next.length - 1]!
  }

  /** Moves a ball; returns false (and leaves the ball where it was) when the position is not allowed. */
  function moveBall(id: string, position: Point): boolean {
    const next = moveBallRule(state.balls, id, position)
    if (!next) return false
    state.balls = next
    return true
  }

  function removeBall(id: string): void {
    state.balls = removeBallRule(state.balls, id)
  }

  // ---- shot ------------------------------------------------------------------------------

  const shot = computed<Shot>(() => ({
    playedBallId: state.playedBallId ?? '',
    movements: sortedMovements(state.movements),
  }))

  const after = computed<Ball[]>(() => computeAfter(state.balls, shot.value))

  const currentMovement = computed<Movement | null>(
    () => state.movements.find((m) => m.ballId === state.currentBallId) ?? null,
  )

  const shotErrors = computed<string[]>(() => {
    if (!state.playedBallId) return ['Kies de gespeelde bal.']
    const problems = validateShot(state.balls, shot.value)
    return problems.length ? ['Elke beweging heeft minstens één punt nodig.'] : []
  })

  const canSave = computed(() => canContinue.value && shotErrors.value.length === 0)

  function ballById(id: string): Ball | undefined {
    return state.balls.find((b) => b.id === id)
  }

  /** Chooses the played ball; its movement always has order 1. */
  function selectPlayedBall(id: string): void {
    const ball = ballById(id)
    if (!ball) return
    if (state.playedBallId === id) return
    // Drop any movement the new played ball already had, and the old played ball's movement.
    const others = state.movements.filter((m) => m.ballId !== id && m.ballId !== state.playedBallId)
    state.playedBallId = id
    state.movements = normalizeOrders([
      { order: 0, ballId: id, path: [{ ...ball.position }], result: 'rest' },
      ...others,
    ])
    state.currentBallId = id
  }

  /** Starts (or resumes) drawing the path of a ball. Creates its movement if needed. */
  function startMovement(id: string): void {
    const ball = ballById(id)
    if (!ball || !state.playedBallId) return
    if (!state.movements.some((m) => m.ballId === id)) {
      state.movements = [
        ...state.movements,
        { order: nextMovementOrder(state.movements), ballId: id, path: [{ ...ball.position }], result: 'rest' },
      ]
    }
    state.currentBallId = id
  }

  /**
   * Adds a point to the current movement's path. Points near a cushion snap to it; a point in or
   * near a hole marks the ball as scored and ends the path at the hole centre.
   */
  function addPathPoint(point: Point): void {
    const m = currentMovement.value
    if (!m || m.result === 'scored') return
    if (isScoringPoint(point)) {
      m.path.push({ ...nearestHole(point).center })
      m.result = 'scored'
      return
    }
    m.path.push(snapToCushion(point))
  }

  /** Removes the last point of the current movement (never the start point). */
  function undoPoint(): void {
    const m = currentMovement.value
    if (!m || m.path.length <= 1) return
    m.path.pop()
    m.result = 'rest'
  }

  /** Removes a whole movement. The played ball's movement is reset instead of removed. */
  function removeMovement(id: string): void {
    const ball = ballById(id)
    if (id === state.playedBallId && ball) {
      state.movements = state.movements.map((m) =>
        m.ballId === id ? { ...m, path: [{ ...ball.position }], result: 'rest' } : m,
      )
    } else {
      state.movements = normalizeOrders(state.movements.filter((m) => m.ballId !== id))
      if (state.currentBallId === id) state.currentBallId = state.playedBallId
    }
  }

  function moveMovement(id: string, direction: 'up' | 'down'): void {
    state.movements = reorderMovement(state.movements, id, direction)
  }

  function finishMovement(): void {
    state.currentBallId = null
  }

  function goToShot(): boolean {
    if (!canContinue.value) return false
    state.step = 'shot'
    state.view = 'before'
    return true
  }

  function backToBefore(): void {
    state.step = 'before'
    state.view = 'before'
    state.currentBallId = null
  }

  function reset(): void {
    state.title = ''
    state.description = ''
    state.authorName = ''
    state.balls = []
    state.step = 'before'
    state.view = 'before'
    state.playedBallId = null
    state.movements = []
    state.currentBallId = null
  }

  return {
    state: readonly(state),
    form: state,
    remaining,
    fieldErrors,
    canContinue,
    canAdd,
    addBall,
    moveBall,
    removeBall,
    shot,
    after,
    currentMovement,
    shotErrors,
    canSave,
    selectPlayedBall,
    startMovement,
    addPathPoint,
    undoPoint,
    removeMovement,
    moveMovement,
    finishMovement,
    goToShot,
    backToBefore,
    reset,
  }
}

export type SituationEditor = ReturnType<typeof useSituationEditor>

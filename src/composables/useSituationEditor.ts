import { computed, reactive, readonly } from 'vue'
import {
  addBall as addBallRule,
  moveBall as moveBallRule,
  nextBallNumber,
  removeBall as removeBallRule,
  validateBefore,
} from '../domain/situation'
import {
  MAX_AUTHOR_LENGTH,
  MAX_BALLS_PER_COLOR,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  type Ball,
  type BallColor,
  type Point,
} from '../domain/types'

export type EditorStep = 'before' | 'shot'

export interface EditorState {
  title: string
  description: string
  authorName: string
  balls: Ball[]
  step: EditorStep
}

/** Editor state for a situation. Positions are in mm; validation uses the domain rules. */
export function useSituationEditor(initial?: Partial<EditorState>) {
  const state = reactive<EditorState>({
    title: '',
    description: '',
    authorName: '',
    balls: [],
    step: 'before',
    ...initial,
  })

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

  function reset(): void {
    state.title = ''
    state.description = ''
    state.authorName = ''
    state.balls = []
    state.step = 'before'
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
    reset,
  }
}

export type SituationEditor = ReturnType<typeof useSituationEditor>

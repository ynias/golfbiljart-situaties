import { describe, expect, it } from 'vitest'
import { useSituationEditor } from './useSituationEditor'

describe('useSituationEditor', () => {
  it('adds, moves and removes balls with sequential numbering', () => {
    const editor = useSituationEditor()
    expect(editor.addBall('white', { x: 200, y: 300 })?.id).toBe('W1')
    expect(editor.addBall('white', { x: 300, y: 300 })?.id).toBe('W2')
    expect(editor.addBall('red', { x: 400, y: 300 })?.id).toBe('R1')
    expect(editor.remaining.value).toEqual({ white: 3, red: 4 })

    expect(editor.moveBall('W1', { x: 450, y: 900 })).toBe(true)
    expect(editor.moveBall('W2', { x: 450, y: 900 })).toBe(false) // on top of W1
    expect(editor.state.balls.find((b) => b.id === 'W2')?.position).toEqual({ x: 300, y: 300 })

    editor.removeBall('W1')
    expect(editor.state.balls.map((b) => b.id)).toEqual(['W1', 'R1'])
  })

  it('refuses an invalid position and the sixth ball', () => {
    const editor = useSituationEditor()
    expect(editor.addBall('red', { x: 5, y: 5 })).toBeNull()
    for (let i = 0; i < 5; i++) editor.addBall('red', { x: 100 + i * 70, y: 500 })
    expect(editor.canAdd('red')).toBe(false)
    expect(editor.addBall('red', { x: 450, y: 900 })).toBeNull()
    expect(editor.canAdd('white')).toBe(true)
  })

  it('requires a title and at least one ball to continue', () => {
    const editor = useSituationEditor()
    expect(editor.canContinue.value).toBe(false)
    expect(editor.fieldErrors.value.title).toBeDefined()
    expect(editor.fieldErrors.value.balls).toBeDefined()
    editor.form.title = 'TEST_situatie'
    editor.addBall('white', { x: 450, y: 1500 })
    expect(editor.canContinue.value).toBe(true)
    editor.form.description = 'x'.repeat(501)
    expect(editor.fieldErrors.value.description).toBeDefined()
  })
})

describe('useSituationEditor – shot', () => {
  function setup() {
    const editor = useSituationEditor()
    editor.form.title = 'TEST_stoot'
    editor.addBall('white', { x: 300, y: 1200 })
    editor.addBall('red', { x: 450, y: 400 })
    editor.addBall('red', { x: 700, y: 900 })
    expect(editor.goToShot()).toBe(true)
    return editor
  }

  it('played ball gets movement 1 starting at its position', () => {
    const editor = setup()
    editor.selectPlayedBall('W1')
    expect(editor.state.movements).toHaveLength(1)
    expect(editor.state.movements[0]).toMatchObject({ order: 1, ballId: 'W1', result: 'rest' })
    expect(editor.state.movements[0]!.path).toEqual([{ x: 300, y: 1200 }])
    expect(editor.state.currentBallId).toBe('W1')
  })

  it('adds points with cushion snap, marks scoring, undoes per point and per movement', () => {
    const editor = setup()
    editor.selectPlayedBall('W1')
    editor.addPathPoint({ x: 40, y: 800 }) // near the left cushion → snaps
    editor.addPathPoint({ x: 420, y: 450 })
    expect(editor.currentMovement.value!.path[1]!.x).toBeCloseTo(30.75)
    expect(editor.currentMovement.value!.path).toHaveLength(3)

    editor.startMovement('R1')
    expect(editor.state.movements).toHaveLength(2)
    expect(editor.state.movements[1]).toMatchObject({ order: 2, ballId: 'R1' })
    editor.addPathPoint({ x: 450, y: 60 }) // into the top hole
    expect(editor.currentMovement.value!.result).toBe('scored')
    expect(editor.currentMovement.value!.path[1]).toEqual({ x: 450, y: 33 })
    // no more points after scoring
    editor.addPathPoint({ x: 450, y: 900 })
    expect(editor.currentMovement.value!.path).toHaveLength(2)

    expect(editor.after.value.map((b) => b.id)).toEqual(['W1', 'R2'])
    expect(editor.after.value[0]!.position).toEqual({ x: 420, y: 450 })
    expect(editor.canSave.value).toBe(true)

    editor.undoPoint()
    expect(editor.currentMovement.value!.result).toBe('rest')
    expect(editor.currentMovement.value!.path).toHaveLength(1)
    expect(editor.canSave.value).toBe(false) // R1 has no end point

    editor.removeMovement('R1')
    expect(editor.state.movements.map((m) => m.ballId)).toEqual(['W1'])
    expect(editor.canSave.value).toBe(true)
  })

  it('reorders movements but keeps the played ball first; played ball reset instead of removed', () => {
    const editor = setup()
    editor.selectPlayedBall('W1')
    editor.addPathPoint({ x: 450, y: 900 })
    editor.startMovement('R1')
    editor.addPathPoint({ x: 450, y: 600 })
    editor.startMovement('R2')
    editor.addPathPoint({ x: 600, y: 600 })
    editor.moveMovement('R2', 'up')
    expect(editor.shot.value.movements.map((m) => m.ballId)).toEqual(['W1', 'R2', 'R1'])
    editor.moveMovement('R2', 'up')
    expect(editor.shot.value.movements.map((m) => m.ballId)).toEqual(['W1', 'R2', 'R1'])
    editor.removeMovement('W1')
    expect(editor.state.movements.find((m) => m.ballId === 'W1')!.path).toHaveLength(1)
  })

  it('changing the played ball drops the old played movement', () => {
    const editor = setup()
    editor.selectPlayedBall('W1')
    editor.addPathPoint({ x: 450, y: 900 })
    editor.startMovement('R1')
    editor.addPathPoint({ x: 450, y: 600 })
    editor.selectPlayedBall('R2')
    expect(editor.shot.value.movements.map((m) => [m.ballId, m.order])).toEqual([
      ['R2', 1],
      ['R1', 2],
    ])
  })

  it('cannot go to the shot step without a title', () => {
    const editor = useSituationEditor()
    editor.addBall('white', { x: 300, y: 1200 })
    expect(editor.goToShot()).toBe(false)
    expect(editor.state.step).toBe('before')
  })
})

describe('useSituationEditor – editing balls after a shot exists', () => {
  it('moving a ball re-anchors its movement; removing a ball clears the shot', () => {
    const editor = useSituationEditor()
    editor.form.title = 'TEST_edit'
    editor.addBall('white', { x: 300, y: 1200 })
    editor.addBall('red', { x: 450, y: 400 })
    editor.goToShot()
    editor.selectPlayedBall('W1')
    editor.addPathPoint({ x: 450, y: 900 })
    editor.backToBefore()
    editor.moveBall('W1', { x: 320, y: 1100 })
    expect(editor.state.movements[0]!.path[0]).toEqual({ x: 320, y: 1100 })
    expect(editor.canSave.value).toBe(true)
    editor.removeBall('R1')
    expect(editor.state.movements).toEqual([])
    expect(editor.state.playedBallId).toBeNull()
  })
})

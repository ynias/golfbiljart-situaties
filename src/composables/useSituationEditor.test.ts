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

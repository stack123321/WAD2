// Owner: Eashvar (testing; for Surya's vibes). Unit tests for categoriesForVibes (Week 10a): which
// kinds of places fit a hangout's vibes, for the spots shown on 08.
import { describe, it, expect } from 'vitest'
import { categoriesForVibes } from '../vibes.js'

describe('TestSuite: categoriesForVibes', () => {
  it('Test1: one vibe gives its categories', () => {
    expect(categoriesForVibes(['chill'])).toEqual(['cafe', 'outdoor'])
  })

  it('Test2: two vibes list each category once', () => {
    const categories = categoriesForVibes(['chill', 'study'])
    expect(categories).toHaveLength(2)
    expect(categories).toContain('cafe')
    expect(categories).toContain('outdoor')
  })

  it('Test3: no vibe picked gives cafes, food and activities', () => {
    expect(categoriesForVibes([])).toEqual(['cafe', 'food', 'activity'])
  })

  it('Test4: an unknown vibe is ignored', () => {
    expect(categoriesForVibes(['unknown', 'food'])).toEqual(['food'])
  })
})

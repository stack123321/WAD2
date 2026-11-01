// Owner: Eashvar (testing; for Surya's "Go again"). Unit tests for finalSpot (Week 10a): a past
// hangout can only be repeated if a place was chosen.
import { describe, it, expect } from 'vitest'
import { finalSpot } from '../goAgain.js'

const cafe = { id: 'spot-1', name: 'Mock Cafe' }
const library = { id: 'spot-2', name: 'Mock Library' }

describe('TestSuite: finalSpot', () => {
  it('Test1: a decided hangout gives back the chosen place', () => {
    const hangout = { final_shortlist_id: 'spot-2', shortlist: [cafe, library] }
    expect(finalSpot(hangout)).toEqual(library)
  })

  it('Test2: a hangout that was never decided has no place', () => {
    expect(finalSpot({ final_shortlist_id: null, shortlist: [cafe] })).toBe(null)
  })

  it('Test3: a chosen place missing from the shortlist counts as none', () => {
    expect(finalSpot({ final_shortlist_id: 'spot-9', shortlist: [cafe] })).toBe(null)
  })

  it('Test4: no hangout at all gives no place', () => {
    expect(finalSpot(null)).toBe(null)
  })
})
